"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { generateAIObject, isAIBusyError, isAIConfigured } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase";
import { normalizeFlowchart } from "@/lib/career/flowchart";
import { buildCareerPlanPrompt, buildFollowUpPrompt, SYSTEM_PROMPT } from "@/lib/career/prompts";
import {
  careerPlanSchema,
  followUpQuestionsSchema,
  GENERAL_QUESTIONS,
  generalScreeningSchema,
  type GeneralScreeningValues,
  type ScreeningQA,
} from "@/lib/career/types";

export type ActionResult = { error: string } | undefined;

const AI_NOT_CONFIGURED =
  "AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY, ANTHROPIC_API_KEY, atau OPENAI_API_KEY ke .env.local lalu restart server.";

const AI_BUSY =
  "Layanan AI sedang sibuk atau batas pemakaian gratis tercapai. Tunggu 1-2 menit lalu coba lagi.";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function loadQA(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from("screening_qa")
    .select("*")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  const qa = (data ?? []) as ScreeningQA[];
  return {
    general: qa.filter((q) => q.question_type === "GENERAL"),
    followUp: qa.filter((q) => q.question_type === "AI_GENERATED"),
  };
}

// ---- Step 1 -> 2: save general screening, then let AI create follow-up questions ----

export async function startScreening(values: GeneralScreeningValues): Promise<ActionResult> {
  const parsed = generalScreeningSchema.safeParse(values);
  if (!parsed.success) return { error: "Data skrining tidak valid. Periksa kembali isian Anda." };

  const userId = await requireUserId();
  const user = await currentUser();
  const supabase = await createSupabaseServerClient();

  const { error: userError } = await supabase.from("users").upsert({
    id: userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    full_name: user?.fullName ?? null,
  });
  if (userError) {
    console.error("Error upserting user:", userError);
    return { error: "Gagal menyimpan data pengguna." };
  }

  const { data: session, error: sessionError } = await supabase
    .from("screening_sessions")
    .insert({ user_id: userId, status: "DRAFT" })
    .select("id")
    .single();
  if (sessionError || !session) {
    console.error("Error creating session:", sessionError);
    return { error: "Gagal membuat sesi skrining." };
  }

  const rows = GENERAL_QUESTIONS.map((q, i) => {
    const value = parsed.data[q.key];
    return {
      session_id: session.id,
      question_type: "GENERAL",
      question_text: q.label,
      answer_text: Array.isArray(value) ? value.join(", ") : value || null,
      order_index: i + 1,
    };
  });
  const { error: qaError } = await supabase.from("screening_qa").insert(rows);
  if (qaError) {
    console.error("Error saving general answers:", qaError);
    await supabase.from("screening_sessions").delete().eq("id", session.id);
    return { error: "Gagal menyimpan jawaban skrining." };
  }

  await supabase
    .from("screening_sessions")
    .update({ status: "AWAITING_AI_QUESTIONS" })
    .eq("id", session.id);

  // If question generation fails, the session page offers a retry.
  await createFollowUpQuestions(supabase, session.id);

  revalidatePath("/dashboard");
  redirect(`/dashboard/screening/${session.id}`);
}

async function createFollowUpQuestions(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ActionResult> {
  if (!isAIConfigured()) return { error: AI_NOT_CONFIGURED };

  try {
    const { general } = await loadQA(supabase, sessionId);
    const object = await generateAIObject({
      schema: followUpQuestionsSchema,
      system: SYSTEM_PROMPT,
      prompt: buildFollowUpPrompt(general),
    });

    const questions = object.questions
      .map((q) => q.question.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (questions.length === 0) return { error: "AI tidak menghasilkan pertanyaan. Coba lagi." };

    // Idempotent on retry: replace any previously generated questions.
    await supabase
      .from("screening_qa")
      .delete()
      .eq("session_id", sessionId)
      .eq("question_type", "AI_GENERATED");

    const { error } = await supabase.from("screening_qa").insert(
      questions.map((question, i) => ({
        session_id: sessionId,
        question_type: "AI_GENERATED",
        question_text: question,
        order_index: i + 1,
      })),
    );
    if (error) throw error;

    await supabase
      .from("screening_sessions")
      .update({ status: "AWAITING_USER_ANSWERS" })
      .eq("id", sessionId);
    return undefined;
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    if (isAIBusyError(error)) return { error: AI_BUSY };
    return { error: "Gagal membuat pertanyaan lanjutan dari AI. Silakan coba lagi." };
  }
}

export async function retryFollowUpQuestions(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { data: session } = await supabase
    .from("screening_sessions")
    .select("status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return { error: "Sesi tidak ditemukan." };
  if (session.status === "COMPLETED") return undefined;

  const result = await createFollowUpQuestions(supabase, sessionId);
  revalidatePath(`/dashboard/screening/${sessionId}`);
  return result;
}

// ---- Step 3 -> 5: save follow-up answers, generate roadmap ----

const answersSchema = z
  .array(z.object({ id: z.string().uuid(), answer: z.string().trim().min(1).max(2000) }))
  .min(1);

export async function submitFollowUpAnswers(
  sessionId: string,
  answers: { id: string; answer: string }[],
): Promise<ActionResult> {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { error: "Semua pertanyaan wajib dijawab." };

  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { data: session } = await supabase
    .from("screening_sessions")
    .select("status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return { error: "Sesi tidak ditemukan." };
  if (session.status === "COMPLETED") {
    const { data: plan } = await supabase
      .from("career_plans")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (plan) redirect(`/dashboard/plans/${plan.id}`);
  }

  for (const { id, answer } of parsed.data) {
    const { error } = await supabase
      .from("screening_qa")
      .update({ answer_text: answer })
      .eq("id", id)
      .eq("session_id", sessionId)
      .eq("question_type", "AI_GENERATED");
    if (error) {
      console.error("Error saving answer:", error);
      return { error: "Gagal menyimpan jawaban." };
    }
  }

  if (!isAIConfigured()) return { error: AI_NOT_CONFIGURED };

  let planId: string;
  try {
    const { general, followUp } = await loadQA(supabase, sessionId);
    const object = await generateAIObject({
      schema: careerPlanSchema,
      system: SYSTEM_PROMPT,
      prompt: buildCareerPlanPrompt(general, followUp),
      maxTokens: 8192,
    });

    const flowchart = normalizeFlowchart(object.flowchart);
    if (flowchart.nodes.length === 0) throw new Error("Empty flowchart");

    const { data: plan, error } = await supabase
      .from("career_plans")
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          title: object.title.trim().slice(0, 255) || "Roadmap Karir",
          flowchart_data: flowchart,
          markdown_content: object.markdown.trim(),
        },
        { onConflict: "session_id" },
      )
      .select("id")
      .single();
    if (error || !plan) throw error ?? new Error("Plan not saved");
    planId = plan.id;

    await supabase.from("screening_sessions").update({ status: "COMPLETED" }).eq("id", sessionId);
  } catch (error) {
    console.error("Error generating career plan:", error);
    if (isAIBusyError(error)) return { error: AI_BUSY };
    return {
      error: "Gagal membuat roadmap karir. Jawaban Anda sudah tersimpan, silakan coba lagi.",
    };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/plans/${planId}`);
}

// ---- Dashboard ----

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("screening_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (error) {
    console.error("Error deleting session:", error);
    return { error: "Gagal menghapus riwayat." };
  }

  revalidatePath("/dashboard");
  return undefined;
}
