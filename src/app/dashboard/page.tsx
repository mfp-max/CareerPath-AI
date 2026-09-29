import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, CheckCircle2, Clock, Compass, Map as MapIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteSessionButton } from "@/components/career/plan-actions";
import { getSessionSummaries, type SessionSummary } from "@/lib/career/data";
import { getCurrentUser } from "@/lib/user";
import type { SessionStatus } from "@/lib/career/types";

export const metadata = { title: "Dashboard" };

const STATUS_LABELS: Record<SessionStatus, string> = {
  DRAFT: "Draft",
  AWAITING_AI_QUESTIONS: "Menunggu pertanyaan AI",
  AWAITING_USER_ANSWERS: "Menunggu jawaban Anda",
  COMPLETED: "Selesai",
};

function formatDate(value: string) {
  return format(new Date(value), "d MMMM yyyy, HH:mm", { locale: localeId });
}

function SessionRow({ session }: { session: SessionSummary }) {
  const href = session.plan
    ? `/dashboard/plans/${session.plan.id}`
    : `/dashboard/screening/${session.id}`;
  const completed = Boolean(session.plan);

  return (
    <Card className="py-0 transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div
          className={
            completed
              ? "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          }
        >
          {completed ? <MapIcon className="size-5" /> : <Clock className="size-5" />}
        </div>
        <Link href={href} className="min-w-0 flex-1 group">
          <p className="truncate font-medium group-hover:underline">
            {session.plan?.title ?? `Skrining: ${session.targetCareer ?? "Tanpa judul"}`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(session.created_at)}</span>
            {session.targetCareer && session.plan && <span>Target: {session.targetCareer}</span>}
          </div>
        </Link>
        <Badge variant={completed ? "secondary" : "outline"} className="hidden sm:inline-flex">
          {completed && <CheckCircle2 className="size-3" />}
          {STATUS_LABELS[session.status]}
        </Badge>
        <Button variant={completed ? "ghost" : "outline"} size="sm" asChild>
          <Link href={href}>
            {completed ? "Lihat" : "Lanjutkan"}
            <ArrowRight />
          </Link>
        </Button>
        <DeleteSessionButton sessionId={session.id} iconOnly />
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [user, sessions] = await Promise.all([getCurrentUser(), getSessionSummaries()]);
  const completed = sessions.filter((s) => s.plan).length;
  const inProgress = sessions.length - completed;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Halo{user?.firstName ? `, ${user.firstName}` : ""} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Lihat kembali roadmap karir Anda atau mulai analisis baru.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/screening/new">
            <Plus />
            Analisis Karir Baru
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total analisis", value: sessions.length },
          { label: "Roadmap selesai", value: completed },
          { label: "Sedang berjalan", value: inProgress },
        ].map((stat) => (
          <Card key={stat.label} className="py-0">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Riwayat Analisis</h2>
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Compass className="size-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Belum ada analisis karir</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Jawab beberapa pertanyaan singkat dan AI akan menyusun roadmap karir yang
                  personal untuk Anda.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/screening/new">Mulai Skrining</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
