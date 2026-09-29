import { z } from "zod";

export type SessionStatus =
  | "DRAFT"
  | "AWAITING_AI_QUESTIONS"
  | "AWAITING_USER_ANSWERS"
  | "COMPLETED";

export type QuestionType = "GENERAL" | "AI_GENERATED";

export interface ScreeningQA {
  id: string;
  session_id: string;
  question_type: QuestionType;
  question_text: string;
  answer_text: string | null;
  order_index: number;
  created_at: string;
}

export interface ScreeningSession {
  id: string;
  user_id: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export const NODE_TYPES = ["start", "step", "milestone", "goal"] as const;
export type FlowNodeType = (typeof NODE_TYPES)[number];

export interface FlowNode {
  id: string;
  label: string;
  type: FlowNodeType;
  description?: string;
  duration?: string;
}

export interface FlowEdge {
  source: string;
  target: string;
}

export interface FlowchartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface CareerPlan {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  flowchart_data: FlowchartData;
  markdown_content: string;
  created_at: string;
}

// ---- Step 1: general screening form ----

export const EDUCATION_OPTIONS = [
  "SMA/SMK",
  "Diploma (D1-D4)",
  "Sarjana (S1)",
  "Magister (S2)",
  "Doktor (S3)",
  "Lainnya",
] as const;

export const BACKGROUND_OPTIONS = [
  "Pelajar",
  "Mahasiswa",
  "Fresh graduate",
  "Karyawan",
  "Freelancer / wirausaha",
  "Sedang mencari kerja",
  "Ingin pindah karir",
] as const;

export const EXPERIENCE_OPTIONS = [
  "Belum ada pengalaman",
  "Kurang dari 1 tahun",
  "1-3 tahun",
  "3-5 tahun",
  "Lebih dari 5 tahun",
] as const;

export const FIELD_OPTIONS = [
  "Teknologi & Software",
  "Data & AI",
  "Desain & Kreatif",
  "Bisnis & Manajemen",
  "Marketing & Komunikasi",
  "Keuangan & Akuntansi",
  "Kesehatan",
  "Pendidikan",
  "Teknik & Manufaktur",
  "Hukum & Pemerintahan",
] as const;

export const STUDY_TIME_OPTIONS = [
  "Kurang dari 5 jam/minggu",
  "5-10 jam/minggu",
  "10-20 jam/minggu",
  "Lebih dari 20 jam/minggu",
] as const;

export const generalScreeningSchema = z.object({
  education: z.string().min(1, "Pilih pendidikan terakhir"),
  major: z.string().trim().max(150),
  background: z.string().min(1, "Pilih latar belakang saat ini"),
  experience: z.string().min(1, "Pilih range pengalaman"),
  fields: z.array(z.string()).min(1, "Pilih minimal satu bidang"),
  interests: z
    .string()
    .trim()
    .min(5, "Ceritakan minat Anda (minimal 5 karakter)")
    .max(1000),
  skills: z.string().trim().max(1000),
  targetCareer: z
    .string()
    .trim()
    .min(2, "Isi target karir (boleh kasar)")
    .max(150),
  studyTime: z.string().min(1, "Pilih waktu belajar"),
});


export type GeneralScreeningValues = z.infer<typeof generalScreeningSchema>;

/** Question labels stored as `question_text` for GENERAL rows, in order. */
export const GENERAL_QUESTIONS: {
  key: keyof GeneralScreeningValues;
  label: string;
}[] = [
  { key: "education", label: "Pendidikan terakhir" },
  { key: "major", label: "Jurusan / bidang studi" },
  { key: "background", label: "Latar belakang saat ini" },
  { key: "experience", label: "Range pengalaman kerja" },
  { key: "fields", label: "Bidang yang diminati" },
  { key: "interests", label: "Minat & hobi" },
  { key: "skills", label: "Skill yang sudah dimiliki" },
  { key: "targetCareer", label: "Target karir" },
  { key: "studyTime", label: "Waktu belajar yang tersedia" },
];

// ---- AI output schemas ----
// Kept free of min/max/optional so they work with strict structured output modes.

export const followUpQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("Pertanyaan follow-up yang spesifik, dalam Bahasa Indonesia"),
      }),
    )
    .describe("3 sampai 5 pertanyaan follow-up"),
});

export const careerPlanSchema = z.object({
  title: z
    .string()
    .describe('Judul roadmap, contoh: "Roadmap Menjadi Senior Backend Engineer"'),
  flowchart: z.object({
    nodes: z.array(
      z.object({
        id: z.string().describe("ID unik node, contoh: '1'"),
        label: z.string().describe("Label singkat tahap (maks ~40 karakter)"),
        type: z.enum(NODE_TYPES),
        description: z
          .string()
          .describe("Penjelasan singkat apa yang dilakukan/dicapai di tahap ini"),
        duration: z.string().describe("Estimasi durasi, contoh: '2-3 bulan'"),
      }),
    ),
    edges: z.array(
      z.object({
        source: z.string(),
        target: z.string(),
      }),
    ),
  }),
  markdown: z.string().describe("Laporan lengkap dalam format Markdown"),
});

export type GeneratedCareerPlan = z.infer<typeof careerPlanSchema>;
