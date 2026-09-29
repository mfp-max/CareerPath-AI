import { notFound, redirect } from "next/navigation";
import { AlertCircle, ClipboardList } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FollowUpForm, RetryQuestionsButton } from "@/components/career/follow-up-form";
import { ScreeningStepper } from "@/components/career/screening-stepper";
import { getSessionWithQA } from "@/lib/career/data";

export const metadata = { title: "Pertanyaan Lanjutan" };

// Server actions invoked from this page call the AI model.
export const maxDuration = 120;

export default async function ScreeningSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSessionWithQA(id);
  if (!result) notFound();

  const { session, qa, planId } = result;
  if (session.status === "COMPLETED" && planId) redirect(`/dashboard/plans/${planId}`);

  const general = qa.filter((q) => q.question_type === "GENERAL");
  const followUp = qa.filter((q) => q.question_type === "AI_GENERATED");
  const hasQuestions = session.status === "AWAITING_USER_ANSWERS" && followUp.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pertanyaan Lanjutan</h1>
        <p className="text-muted-foreground">
          Pertanyaan ini dibuat khusus oleh AI berdasarkan jawaban awal Anda.
        </p>
      </div>
      <ScreeningStepper current={hasQuestions ? 3 : 2} />

      <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
        <AccordionItem value="general" className="border-b-0">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              Ringkasan jawaban skrining umum
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {general.map((q) => (
                <div key={q.id}>
                  <dt className="text-xs text-muted-foreground">{q.question_text}</dt>
                  <dd className="text-sm">{q.answer_text || "—"}</dd>
                </div>
              ))}
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {hasQuestions ? (
        <FollowUpForm sessionId={session.id} questions={followUp} />
      ) : (
        <Card>
          <CardContent className="space-y-5 py-8">
            <Alert>
              <AlertCircle />
              <AlertTitle>Pertanyaan AI belum tersedia</AlertTitle>
              <AlertDescription>
                AI belum berhasil membuat pertanyaan lanjutan untuk sesi ini (misalnya karena
                koneksi atau konfigurasi API). Jawaban skrining umum Anda sudah tersimpan.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <RetryQuestionsButton sessionId={session.id} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
