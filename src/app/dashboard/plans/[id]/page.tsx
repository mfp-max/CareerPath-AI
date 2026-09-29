import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, CalendarDays, FileText, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowchartView } from "@/components/career/flowchart-view";
import { MarkdownView } from "@/components/career/markdown-view";
import {
  DeleteSessionButton,
  ExportMenu,
  RescreenButton,
} from "@/components/career/plan-actions";
import { getCareerPlan } from "@/lib/career/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getCareerPlan(id);
  return { title: plan?.title ?? "Roadmap Karir" };
}

export default async function CareerPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getCareerPlan(id);
  if (!plan) notFound();

  const createdAt = format(new Date(plan.created_at), "d MMMM yyyy", { locale: localeId });
  const stageCount = plan.flowchart_data.nodes.length;

  return (
    <article className="space-y-6 print:space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 print:hidden" asChild>
        <Link href="/dashboard">
          <ArrowLeft />
          Kembali ke Dashboard
        </Link>
      </Button>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary print:text-black">
            Career Path AI · Roadmap Karir
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {plan.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {createdAt}
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="size-4" />
              {stageCount} tahap
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <ExportMenu plan={plan} />
          <RescreenButton />
          <DeleteSessionButton sessionId={plan.session_id} redirectTo="/dashboard" />
        </div>
      </header>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:px-0">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="size-5 text-primary" />
            Flowchart Jalur Karir
          </CardTitle>
          <CardDescription className="print:hidden">
            Klik setiap tahap untuk melihat detail dan estimasi durasinya.
          </CardDescription>
        </CardHeader>
        <CardContent className="print:px-0">
          <FlowchartView data={plan.flowchart_data} />
        </CardContent>
      </Card>

      <Card className="print:break-before-page print:border-0 print:shadow-none">
        <CardHeader className="print:px-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Laporan Lengkap
          </CardTitle>
          <CardDescription className="print:hidden">
            Rincian jalur karir, skill tree, resource belajar, dan estimasi timeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="print:px-0">
          <MarkdownView content={plan.markdown_content} className="max-w-3xl print:max-w-none" />
        </CardContent>
      </Card>
    </article>
  );
}
