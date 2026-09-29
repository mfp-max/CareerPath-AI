import { SignUp } from "@clerk/nextjs";
import { AppHeader } from "@/components/career/app-header";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="flex justify-center px-4 py-12 sm:py-20">
        <SignUp />
      </main>
    </div>
  );
}
