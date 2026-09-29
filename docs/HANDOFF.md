# Career Path AI — Catatan Proyek & Handoff

Dokumen ini merangkum semua yang sudah dikerjakan, supaya sesi berikutnya (misalnya saat pindah ke
domain sendiri) bisa langsung lanjut tanpa mulai dari awal.

> **Tidak ada key/secret di dokumen ini.** Semua nilai rahasia ada di `.env.local` (tidak di-commit)
> dan di Environment Variables project Vercel.

Terakhir diperbarui: 29 September 2026.

---

## 1. Ringkasan aplikasi

Aplikasi skrining karir berbasis AI (spesifikasi asli: [`app_summary.md`](../app_summary.md)):

1. **Skrining umum** — form: pendidikan, jurusan, latar belakang, pengalaman, bidang minat, minat/hobi,
   skill, target karir, waktu belajar.
2. **Pertanyaan adaptif AI** — AI membuat 3–5 pertanyaan lanjutan dari jawaban awal.
3. **Jawab detail** — pengguna menjawab pertanyaan AI.
4. **Proses AI** — AI membuat roadmap: flowchart (JSON node/edge) + laporan Markdown (profil, jalur
   karir, skill tree, resource belajar, timeline, kendala, langkah pertama).
5. **Hasil** — flowchart interaktif (klik node, zoom), laporan, ekspor PDF (print) & Markdown (+ Mermaid),
   analisis baru, hapus.
6. **Dashboard** — riwayat semua sesi, statistik, lanjutkan sesi yang belum selesai.

## 2. Lokasi & akun

| Hal | Nilai |
|---|---|
| Aplikasi online | https://careerpath-ai-rho.vercel.app |
| GitHub | https://github.com/mfp-max/CareerPath-AI (branch `main`) |
| Vercel | project `careerpath-ai`, tim `mfajarivanpratama-3925` (Hobby/gratis) |
| Clerk | aplikasi "Career Path AI" `app_3K0DNTlK5XPFxjEjMpD6oWQ8jS9`, **instance development** (`infinite-frog-5589.clerk.accounts.dev`); production belum dibuat |
| Supabase | project ref `foossgakufxtjjeximmu` (`https://foossgakufxtjjeximmu.supabase.co`) |
| AI | Google Gemini (free tier) lewat endpoint OpenAI-compatible |

## 3. Arsitektur & file penting

- **Next.js 15.5.x App Router** + TypeScript, Tailwind v4, shadcn/ui. Tidak ada library tambahan
  (permintaan awal: "gunakan library yang sudah ada") — flowchart (SVG) & renderer Markdown dibuat sendiri.
- `supabase/migrations/002_career_path_schema.sql` — tabel `users`, `screening_sessions`,
  `screening_qa`, `career_plans` + RLS berbasis `auth.jwt() ->> 'sub'` (Clerk user ID, tipe TEXT).
  Tabel `users` tanpa `password_hash` karena login ditangani Clerk. *(Migration `001` hanya contoh
  starter kit, tidak dipakai.)*
- `src/app/dashboard/actions.ts` — server actions seluruh alur (status sesi: `DRAFT` →
  `AWAITING_AI_QUESTIONS` → `AWAITING_USER_ANSWERS` → `COMPLETED`). Jawaban disimpan sebelum AI
  dipanggil, jadi kalau AI gagal pengguna tinggal klik coba lagi.
- `src/lib/ai.ts` — pemilihan provider: Anthropic → OpenAI → Gemini (berdasarkan key yang ada).
  Gemini punya **fallback otomatis** antar model (`gemini-flash-latest`, `gemini-3.5-flash`,
  `gemini-flash-lite-latest`, `gemini-3.5-flash-lite`) karena free tier sering 429/503 dan model lama
  dipensiunkan (mis. `gemini-2.5-flash` → 404 untuk user baru). `AI_MODEL` opsional untuk memaksa model.
- `src/lib/career/` — `types.ts` (schema zod form & output AI), `prompts.ts`, `flowchart.ts`
  (normalisasi + perbaikan edge dari AI, layout, ekspor Mermaid), `data.ts` (query server).
- `src/components/career/` — form, stepper, flowchart, markdown, ekspor/hapus, header.
- `src/lib/supabase.ts` — client dibuat *lazy*; dashboard menampilkan peringatan jika env Supabase kosong.
  Menerima `NEXT_PUBLIC_SUPABASE_ANON_KEY` **atau** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `src/middleware.ts` — Clerk melindungi `/dashboard(.*)`; matcher berisi `/__clerk/:path*`.

## 4. Environment variables

Nama variabel (nilai ada di `.env.local` & Vercel):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL, NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL, NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
GEMINI_API_KEY            # atau ANTHROPIC_API_KEY / OPENAI_API_KEY
AI_MODEL                  # opsional
```

Di Vercel sudah diisi untuk **production** dan **preview**. Jika menambah variabel baru di lokal,
tambahkan juga di Vercel (`npx vercel@latest env add NAMA production`).

## 5. Status konfigurasi (sudah diverifikasi)

- ✅ Clerk terpasang (CLI login, `clerk init`, `clerk doctor` lolos); halaman `/sign-in` & `/sign-up`;
  tombol Masuk/Daftar/UserButton di header.
- ✅ Integrasi Clerk ↔ Supabase: token Clerk berisi `role: authenticated` dan Supabase menerimanya
  (Third-Party Auth aktif) — diuji langsung, HTTP 200.
- ✅ Migration `002` sudah dijalankan di Supabase (4 tabel ada).
- ✅ Alur AI end-to-end diuji dengan kode asli (pertanyaan + roadmap berhasil dibuat).
- ✅ Deploy Vercel production berhasil; `.env.local` tidak ikut ter-upload (`.vercelignore`).
- ✅ Next.js di-upgrade 15.5.4 → 15.5.26 (Vercel memblokir versi yang rentan).
- ✅ Auto-deploy GitHub → Vercel aktif: setiap push ke `main` otomatis deploy ke production.

## 6. Keputusan & catatan penting

- Pengguna ingin **semua pengaturan dikerjakan otomatis oleh Claude**, bukan langkah manual.
  Komunikasi dalam Bahasa Indonesia.
- Jangan pernah menampilkan/commit nilai secret. `.env.local` boleh ditambah baris, tapi jangan dibaca
  isinya secara utuh.
- Jangan menjalankan `npm run dev` kecuali diminta (permintaan awal pengguna); saat dev server jalan,
  jangan `next build` di folder proyek (bentrok folder `.next`).
- Error hydration `data-atm-ext-installed` berasal dari ekstensi browser → sudah ditangani dengan
  `suppressHydrationWarning` di `<body>`.
- Tema shadcn untuk Clerk (`@clerk/ui`) sengaja **tidak** dipasang (tanpa library baru).

## 7. Rencana: pindah ke domain sendiri

Saat sudah punya domain (contoh: `careerpath.id`), langkah yang perlu dilakukan:

1. **Vercel** — tambahkan domain ke project (`npx vercel@latest domains add careerpath.id`), lalu atur DNS
   di registrar sesuai instruksi Vercel (record A / CNAME). Tunggu status "Valid Configuration".
2. **Clerk production instance** — buat instance production untuk aplikasi
   `app_3K0DNTlK5XPFxjEjMpD6oWQ8jS9` dengan domain tersebut; tambahkan record DNS yang diminta Clerk
   (biasanya CNAME `clerk.`, `accounts.`, dan record email). Aktifkan kembali **integrasi Supabase**
   di instance production (agar token berisi `role: authenticated`).
3. **Supabase** — di Authentication → Third-Party Auth, tambahkan domain Clerk **production**
   (misal `clerk.careerpath.id`) di samping domain development.
4. **Env Vercel (production)** — ganti `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` dengan key
   production (`pk_live_…`, `sk_live_…`); lokal tetap memakai key development.
5. **Redeploy** production, lalu uji: daftar akun baru, skrining lengkap, cek data tersimpan.
6. Catatan: user di instance development **tidak** otomatis pindah ke production (akun dibuat ulang);
   data lama di Supabase terikat ke user ID development.

Opsional sekaligus: ganti ke API key AI berbayar jika free tier Gemini sering sibuk.

## 8. Riwayat pengerjaan (ringkas)

1. Aplikasi dibangun dari starter kit CodeGuide sesuai `app_summary.md`.
2. Clerk CLI dipasang & aplikasi di-link; halaman sign-in/up dibuat; `ClerkProvider` dipindah ke dalam `<body>`.
3. Skill agent Clerk dipasang di `.claude/skills` (`npx skills add clerk/skills`).
4. Error `supabaseUrl is required` → client Supabase dibuat lazy + pesan setup.
5. Error "AI belum dikonfigurasi" → pengguna tidak punya key Anthropic; ditambahkan dukungan Gemini
   (free tier) + fallback model otomatis; baris `AI_MODEL=gemini-2.5-flash` (model pensiun) dihapus.
6. Commit & push ke GitHub; deploy ke Vercel (setelah upgrade Next.js).
7. Vercel GitHub App dipasang di akun `mfp-max` dan repo disambungkan (`vercel git connect`) —
   auto-deploy aktif.

## 9. Cara melanjutkan di sesi baru

Buka Claude Code di folder ini dan tulis, misalnya:

> Baca `docs/HANDOFF.md`. Saya sudah punya domain `namadomain.com`. Tolong pindahkan aplikasi ke domain
> ini dan aktifkan Clerk production sampai semuanya beres.
