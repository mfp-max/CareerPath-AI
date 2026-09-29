import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from "@/components/career/app-header";
import { getMissingSupabaseEnv } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const missingEnv = getMissingSupabaseEnv();

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {missingEnv.length > 0 ? (
          <Alert className="mx-auto max-w-2xl">
            <AlertTriangle />
            <AlertTitle>Supabase belum dikonfigurasi</AlertTitle>
            <AlertDescription>
              <p>Tambahkan environment variable berikut ke <code>.env.local</code>:</p>
              <ul className="list-disc pl-5 font-mono text-xs">
                {missingEnv.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p>Setelah itu restart server development (hentikan lalu jalankan ulang).</p>
            </AlertDescription>
          </Alert>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
