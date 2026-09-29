"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ProcessingState({ title, messages }: { title: string; messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), 3500);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="relative">
          <Loader2 className="size-14 animate-spin text-primary/30" strokeWidth={1.5} />
          <Sparkles className="absolute inset-0 m-auto size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {messages[index]}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Proses ini biasanya memakan waktu 15–60 detik. Jangan tutup halaman ini.
        </p>
      </CardContent>
    </Card>
  );
}
