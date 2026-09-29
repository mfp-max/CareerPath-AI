import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  GitBranch,
  History,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/career/app-header";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Skrining Umum",
    description:
      "Form singkat tentang pendidikan, latar belakang, minat, bidang, dan range pengalaman Anda.",
  },
  {
    icon: MessagesSquare,
    title: "Pertanyaan Adaptif AI",
    description:
      "AI membaca jawaban awal lalu membuat 3–5 pertanyaan lanjutan untuk menggali preferensi, blocker, dan keahlian Anda.",
  },
  {
    icon: GitBranch,
    title: "Flowchart Jalur Karir",
    description:
      "Visualisasi interaktif tahapan dari posisi Anda sekarang hingga target karir utama.",
  },
  {
    icon: FileText,
    title: "Laporan Lengkap",
    description:
      "Skill tree, rekomendasi resource belajar, dan estimasi timeline dalam format Markdown.",
  },
  {
    icon: History,
    title: "Dashboard & Riwayat",
    description:
      "Simpan semua hasil analisis, ekspor ke PDF/Markdown, dan lakukan re-screening kapan saja.",
  },
];

const STEPS = [
  "Isi skrining umum",
  "AI membuat pertanyaan spesifik",
  "Jawab pertanyaan detail",
  "AI memproses jawaban",
  "Lihat flowchart & laporan",
];

function PrimaryCta({ size = "lg" }: { size?: "lg" | "default" }) {
  return (
    <>
      <SignedIn>
        <Button size={size} asChild>
          <Link href="/dashboard/screening/new">
            Mulai Skrining Karir
            <ArrowRight />
          </Link>
        </Button>
      </SignedIn>
      <SignedOut>
        <SignUpButton forceRedirectUrl="/dashboard/screening/new">
          <Button size={size}>
            Mulai Skrining Karir
            <ArrowRight />
          </Button>
        </SignUpButton>
      </SignedOut>
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="mx-auto mb-5 w-fit rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            Skrining karir berbasis AI
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Temukan dan rencanakan jalur karir Anda, langkah demi langkah
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
            Jawab beberapa pertanyaan, biarkan AI menggali lebih dalam, lalu dapatkan flowchart
            jalur karir dan roadmap belajar yang personal — dari level pemula hingga target utama.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta />
            <SignedIn>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">Lihat Riwayat</Link>
              </Button>
            </SignedIn>
            <SignedOut>
              <SignInButton forceRedirectUrl="/dashboard">
                <Button size="lg" variant="outline">
                  Sudah punya akun? Masuk
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Semua yang Anda butuhkan untuk merencanakan karir
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="py-0">
              <CardContent className="space-y-3 p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Cara kerjanya
          </h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step} className="flex flex-col items-center gap-3 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Siap memulai?</h2>
        <p className="mt-3 text-muted-foreground">
          Skrining hanya butuh sekitar 5 menit. Hasilnya bisa Anda simpan dan unduh.
        </p>
        <div className="mt-8 flex justify-center">
          <PrimaryCta />
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Career Path AI
      </footer>
    </div>
  );
}
