import type { ScreeningQA } from "./types";

export const SYSTEM_PROMPT = `Anda adalah konselor karir senior dan career coach yang berpengalaman di pasar kerja Indonesia maupun global.
Anda memberikan saran yang jujur, realistis, spesifik, dan dapat langsung dieksekusi.
Selalu gunakan Bahasa Indonesia yang jelas dan ramah.`;

function formatQA(qa: ScreeningQA[]): string {
  return qa
    .map((item) => `- ${item.question_text}: ${item.answer_text?.trim() || "(tidak diisi)"}`)
    .join("\n");
}

export function buildFollowUpPrompt(general: ScreeningQA[]): string {
  return `Berikut data skrining awal seorang pengguna:

${formatQA(general)}

Tugas Anda: buat 3 sampai 5 pertanyaan follow-up yang kontekstual dan spesifik untuk pengguna ini.
Tujuan pertanyaan adalah menggali lebih dalam:
- preferensi kerja (lingkungan, gaya kerja, industri, remote/onsite, dsb.)
- blocker atau kendala (waktu, biaya, lokasi, kepercayaan diri, dsb.)
- tingkat keahlian nyata terkait target karir
- motivasi dan target jangka panjang

Aturan:
- Setiap pertanyaan harus merujuk pada jawaban pengguna, jangan generik.
- Satu pertanyaan hanya menanyakan satu hal utama, bersifat terbuka (bukan ya/tidak).
- Jangan menanyakan ulang hal yang sudah dijawab.
- Maksimal 5 pertanyaan.`;
}

export function buildCareerPlanPrompt(general: ScreeningQA[], followUp: ScreeningQA[]): string {
  return `Berikut hasil skrining lengkap seorang pengguna.

## Data umum
${formatQA(general)}

## Jawaban pertanyaan lanjutan
${formatQA(followUp)}

Buat roadmap karir personal untuk pengguna ini dengan output:

1. "title": judul roadmap, contoh "Roadmap Menjadi Senior Backend Engineer".

2. "flowchart": jalur karir bertahap dari kondisi pengguna saat ini hingga target utama.
   - 6 sampai 12 node. Node pertama bertipe "start" (titik awal pengguna), node terakhir bertipe "goal" (target utama).
   - Gunakan "step" untuk tahap belajar/aktivitas dan "milestone" untuk pencapaian penting (misal: posisi kerja pertama, sertifikasi, portofolio selesai).
   - Label singkat (maksimal ~40 karakter). Isi "description" (1-2 kalimat) dan "duration" (estimasi, misal "2-3 bulan").
   - "edges" menghubungkan node secara berurutan. Boleh ada cabang paralel (misal dua skill dipelajari bersamaan) yang kemudian bertemu lagi, tapi jangan ada siklus.
   - Sesuaikan durasi dengan waktu belajar yang tersedia bagi pengguna.

3. "markdown": laporan rinci dalam Markdown dengan struktur heading berikut:
   ## Ringkasan Profil
   ## Jalur Karir (jelaskan tiap tahap sesuai flowchart, termasuk alasan dan output yang diharapkan)
   ## Skill Tree (daftar bertingkat: kategori skill > sub-skill, tandai prioritas)
   ## Rekomendasi Resource Belajar (gunakan tabel: Resource | Jenis | Topik | Gratis/Berbayar; utamakan resource nyata dan terkenal)
   ## Estimasi Timeline (gunakan tabel: Fase | Durasi | Target Output)
   ## Mengatasi Kendala (tanggapi blocker yang disebut pengguna)
   ## Langkah Pertama Minggu Ini (3-5 aksi konkret, berupa checklist)

   Jangan menyertakan judul utama (H1) karena judul sudah ditampilkan terpisah. Jangan sertakan blok kode mermaid.`;
}
