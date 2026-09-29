"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { startScreening } from "@/app/dashboard/actions";
import { ProcessingState } from "@/components/career/processing-state";
import {
  BACKGROUND_OPTIONS,
  EDUCATION_OPTIONS,
  EXPERIENCE_OPTIONS,
  FIELD_OPTIONS,
  generalScreeningSchema,
  STUDY_TIME_OPTIONS,
  type GeneralScreeningValues,
} from "@/lib/career/types";

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <FormControl>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function GeneralScreeningForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<GeneralScreeningValues>({
    resolver: zodResolver(generalScreeningSchema),
    defaultValues: {
      education: "",
      major: "",
      background: "",
      experience: "",
      fields: [],
      interests: "",
      skills: "",
      targetCareer: "",
      studyTime: "",
    },
  });

  const onSubmit = (values: GeneralScreeningValues) => {
    startTransition(async () => {
      const result = await startScreening(values);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <>
      {isPending && (
        <ProcessingState
          title="AI sedang membaca profil Anda"
          messages={[
            "Menyimpan data skrining awal…",
            "Menganalisis latar belakang dan minat…",
            "Menyusun pertanyaan lanjutan yang relevan…",
          ]}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={cn(isPending && "hidden")}>
          <Card>
            <CardHeader>
              <CardTitle>Langkah 1: Skrining Umum</CardTitle>
              <CardDescription>
                Ceritakan kondisi Anda saat ini. Target karir boleh masih kasar — AI akan
                membantu mempertajamnya.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pendidikan terakhir</FormLabel>
                      <SelectField
                        value={field.value}
                        onChange={field.onChange}
                        options={EDUCATION_OPTIONS}
                        placeholder="Pilih pendidikan"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Jurusan / bidang studi{" "}
                        <span className="font-normal text-muted-foreground">(opsional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Teknik Informatika" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="background"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latar belakang saat ini</FormLabel>
                      <SelectField
                        value={field.value}
                        onChange={field.onChange}
                        options={BACKGROUND_OPTIONS}
                        placeholder="Pilih status"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="studyTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waktu belajar yang tersedia</FormLabel>
                      <SelectField
                        value={field.value}
                        onChange={field.onChange}
                        options={STUDY_TIME_OPTIONS}
                        placeholder="Pilih estimasi waktu"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Range pengalaman kerja</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid gap-2 sm:grid-cols-3"
                      >
                        {EXPERIENCE_OPTIONS.map((option) => (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                          >
                            <RadioGroupItem value={option} />
                            {option}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fields"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bidang yang diminati</FormLabel>
                    <FormDescription>Boleh pilih lebih dari satu.</FormDescription>
                    <div className="flex flex-wrap gap-2">
                      {FIELD_OPTIONS.map((option) => {
                        const checked = field.value.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={checked}
                            onClick={() =>
                              field.onChange(
                                checked
                                  ? field.value.filter((v) => v !== option)
                                  : [...field.value, option],
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:bg-accent",
                            )}
                          >
                            {checked && <Check className="size-3.5" />}
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetCareer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target karir</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Backend Engineer, Data Analyst, UI/UX Designer"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Belum yakin? Tulis saja gambaran kasarnya, misal &quot;kerja di bidang
                      teknologi yang tidak terlalu banyak coding&quot;.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minat & hobi</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Apa yang Anda sukai atau kerjakan di waktu luang?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Skill yang sudah dimiliki{" "}
                      <span className="font-normal text-muted-foreground">(opsional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Contoh: Excel tingkat lanjut, dasar Python, public speaking"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="justify-end border-t pt-6">
              <Button type="submit" disabled={isPending}>
                Lanjut ke Pertanyaan AI
                <ArrowRight />
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}
