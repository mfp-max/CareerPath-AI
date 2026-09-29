"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { retryFollowUpQuestions, submitFollowUpAnswers } from "@/app/dashboard/actions";
import { ProcessingState } from "@/components/career/processing-state";

interface Question {
  id: string;
  question_text: string;
  answer_text: string | null;
}

const MAX_ANSWER_LENGTH = 2000;

export function FollowUpForm({
  sessionId,
  questions,
}: {
  sessionId: string;
  questions: Question[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showErrors, setShowErrors] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.answer_text ?? ""])),
  );

  const unanswered = questions.filter((q) => !answers[q.id]?.trim());

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (unanswered.length > 0) {
      setShowErrors(true);
      document.getElementById(`answer-${unanswered[0].id}`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = await submitFollowUpAnswers(
        sessionId,
        questions.map((q) => ({ id: q.id, answer: answers[q.id].trim() })),
      );
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <>
      {isPending && (
        <ProcessingState
          title="AI sedang menyusun roadmap karir Anda"
          messages={[
            "Menggabungkan seluruh jawaban Anda…",
            "Memetakan tahapan dari posisi awal ke target…",
            "Menyusun skill tree dan prioritas belajar…",
            "Mencari rekomendasi resource belajar…",
            "Menghitung estimasi timeline…",
          ]}
        />
      )}

      <form onSubmit={onSubmit} className={cn(isPending && "hidden")} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Langkah 3: Jawab Pertanyaan dari AI
            </CardTitle>
            <CardDescription>
              AI menyusun {questions.length} pertanyaan berdasarkan profil Anda. Semakin detail
              jawaban Anda, semakin personal roadmap yang dihasilkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q, index) => {
              const invalid = showErrors && !answers[q.id]?.trim();
              return (
                <div key={q.id} className="space-y-2">
                  <Label htmlFor={`answer-${q.id}`} className="items-start leading-6">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    {q.question_text}
                  </Label>
                  <Textarea
                    id={`answer-${q.id}`}
                    rows={3}
                    maxLength={MAX_ANSWER_LENGTH}
                    value={answers[q.id]}
                    aria-invalid={invalid}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Tulis jawaban Anda…"
                  />
                  {invalid && (
                    <p className="text-sm text-destructive">Pertanyaan ini wajib dijawab.</p>
                  )}
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="justify-between gap-4 border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {questions.length - unanswered.length}/{questions.length} terjawab
            </p>
            <Button type="submit" disabled={isPending}>
              <Sparkles />
              Buat Roadmap Karir
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}

export function RetryQuestionsButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryFollowUpQuestions(sessionId);
          if (result?.error) toast.error(result.error);
          else router.refresh();
        })
      }
    >
      <RefreshCw className={cn(isPending && "animate-spin")} />
      {isPending ? "Membuat pertanyaan…" : "Buat Pertanyaan AI"}
    </Button>
  );
}
