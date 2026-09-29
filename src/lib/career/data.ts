import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { normalizeFlowchart } from "./flowchart";
import type { CareerPlan, ScreeningQA, ScreeningSession, SessionStatus } from "./types";

export interface SessionSummary {
  id: string;
  status: SessionStatus;
  created_at: string;
  targetCareer: string | null;
  plan: { id: string; title: string; created_at: string } | null;
}

type PlanRef = { id: string; title: string; created_at: string };

/** PostgREST returns one-to-one embeds as an object, others as arrays. */
function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getSessionSummaries(): Promise<SessionSummary[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("screening_sessions")
    .select(
      `id, status, created_at,
       career_plans ( id, title, created_at ),
       screening_qa ( question_text, answer_text, question_type )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const qa = (row.screening_qa ?? []) as Pick<
      ScreeningQA,
      "question_text" | "answer_text" | "question_type"
    >[];
    const target = qa.find(
      (q) => q.question_type === "GENERAL" && q.question_text === "Target karir",
    );
    return {
      id: row.id as string,
      status: row.status as SessionStatus,
      created_at: row.created_at as string,
      targetCareer: target?.answer_text ?? null,
      plan: firstOrNull(row.career_plans as PlanRef | PlanRef[] | null),
    };
  });
}

export async function getSessionWithQA(
  sessionId: string,
): Promise<{ session: ScreeningSession; qa: ScreeningQA[]; planId: string | null } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: session, error } = await supabase
    .from("screening_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !session) {
    if (error) console.error("Error fetching session:", error);
    return null;
  }

  const [{ data: qa }, { data: plan }] = await Promise.all([
    supabase
      .from("screening_qa")
      .select("*")
      .eq("session_id", sessionId)
      .order("question_type", { ascending: false }) // GENERAL before AI_GENERATED
      .order("order_index", { ascending: true }),
    supabase.from("career_plans").select("id").eq("session_id", sessionId).maybeSingle(),
  ]);

  return {
    session: session as ScreeningSession,
    qa: (qa ?? []) as ScreeningQA[],
    planId: (plan?.id as string | undefined) ?? null,
  };
}

export const getCareerPlan = cache(async (planId: string): Promise<CareerPlan | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("career_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error fetching career plan:", error);
    return null;
  }

  return { ...(data as CareerPlan), flowchart_data: normalizeFlowchart(data.flowchart_data) };
});
