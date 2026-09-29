import { GeneralScreeningForm } from "@/components/career/general-screening-form";
import { ScreeningStepper } from "@/components/career/screening-stepper";

export const metadata = { title: "Skrining Baru" };

// Server actions invoked from this page call the AI model.
export const maxDuration = 120;

export default function NewScreeningPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Skrining Karir</h1>
        <p className="text-muted-foreground">
          Jawab pertanyaan berikut, AI akan menggali lebih dalam dan menyusun roadmap karir Anda.
        </p>
      </div>
      <ScreeningStepper current={1} />
      <GeneralScreeningForm />
    </div>
  );
}
