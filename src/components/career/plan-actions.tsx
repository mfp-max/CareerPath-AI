"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Printer, RotateCcw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSession } from "@/app/dashboard/actions";
import { toMermaid } from "@/lib/career/flowchart";
import type { CareerPlan } from "@/lib/career/types";

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "career-roadmap"
  );
}

function buildMarkdownExport(plan: CareerPlan) {
  const date = new Date(plan.created_at).toLocaleDateString("id-ID", { dateStyle: "long" });
  return [
    `# ${plan.title}`,
    `_Dibuat oleh Career Path AI pada ${date}_`,
    "## Flowchart Jalur Karir",
    "```mermaid",
    toMermaid(plan.flowchart_data),
    "```",
    plan.markdown_content,
  ].join("\n\n");
}

export function ExportMenu({ plan }: { plan: CareerPlan }) {
  const downloadMarkdown = () => {
    const blob = new Blob([buildMarkdownExport(plan)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(plan.title)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("File Markdown berhasil diunduh");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download />
          Ekspor
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer />
          PDF (Cetak / Simpan sebagai PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadMarkdown}>
          <FileText />
          Markdown (.md)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RescreenButton({ variant = "outline" }: { variant?: "outline" | "default" }) {
  return (
    <Button variant={variant} asChild>
      <Link href="/dashboard/screening/new">
        <RotateCcw />
        Analisis Baru
      </Link>
    </Button>
  );
}

export function DeleteSessionButton({
  sessionId,
  redirectTo,
  iconOnly = false,
}: {
  sessionId: string;
  redirectTo?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onConfirm = () =>
    startTransition(async () => {
      const result = await deleteSession(sessionId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Riwayat analisis dihapus");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size={iconOnly ? "icon" : "default"}
          className="text-muted-foreground hover:text-destructive"
          disabled={isPending}
          aria-label="Hapus riwayat"
        >
          <Trash2 />
          {!iconOnly && "Hapus"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus riwayat analisis ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Jawaban skrining dan roadmap karir yang terkait akan dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

