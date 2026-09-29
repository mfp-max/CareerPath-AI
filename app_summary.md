Spesifikasi Ringkas Aplikasi Career Path AI

Aplikasi skrining karir berbasis AI yang membantu pengguna menentukan dan merencanakan jalur karir melalui pertanyaan bertahap, visualisasi flowchart, serta penjelasan rinci dalam format Markdown.

1. Fitur Utama

Onboarding & Skrining Umum

Form awal sederhana untuk mengumpulkan data dasar pengguna (pendidikan, latar belakang, minat, bidang yang diminati, serta range pengalaman).

Adaptive AI Dynamic Questioning

AI menganalisis jawaban awal dan membuat 3–5 pertanyaan follow-up yang kontekstual dan spesifik untuk menggali preferensi, blocker, atau keahlian pengguna secara mendalam.

Career Roadmap Generator

AI memproses seluruh jawaban dan menghasilkan dua bentuk output:

Visual Flowchart: Jalur karir bertahap dari level pemula hingga target utama.

Markdown Report: Rincian jalur karir, skill tree, rekomendasi resource belajar, serta estimasi linimasa (timeline).

Dashboard & History

Pengguna dapat melihat kembali hasil analisis karir sebelumnya, melakukan ekspor ke format PDF/Markdown, atau membuat analisis baru (re-screening).

2. Alur Aplikasi (User Flow)

 [User Register / Login]
           │
           ▼
 [Langkah 1: Skrining Umum] ───────> (Pengguna mengisi data umum & target karir kasar)
           │
           ▼
 [Langkah 2: Dynamic Questioning] ─> (AI membaca data awal -> Generate 3-5 pertanyaan spesifik)
           │
           ▼
 [Langkah 3: Pengisian Detail] ────> (Pengguna menjawab pertanyaan spesifik dari AI)
           │
           ▼
 [Langkah 4: Processing AI] ────────> (AI memproses seluruh jawaban -> Buat Flowchart + Markdown)
           │
           ▼
 [Langkah 5: Halaman Hasil] ────────> (Tampilan Flowchart Interaktif & Penjelasan Markdown)


3. Skema Database (PostgreSQL)

Skema dibuat sederhana namun fleksibel untuk menyimpan histori skrining, pertanyaan AI, serta hasil flowchart.

-- Enable Extension untuk UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Screening Sessions
-- Menyimpan status sesi skrining per user
CREATE TABLE screening_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', 
    -- Status: 'DRAFT', 'AWAITING_AI_QUESTIONS', 'AWAITING_USER_ANSWERS', 'COMPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Screening Questions & Answers
-- Menyimpan pertanyaan (baik umum maupun buatan AI) beserta jawaban user
CREATE TABLE screening_qa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL, -- 'GENERAL' atau 'AI_GENERATED'
    question_text TEXT NOT NULL,
    answer_text TEXT,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Career Plans (Hasil Akhir)
CREATE TABLE career_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL, -- Contoh: "Roadmap Menjadi Senior Backend Engineer"
    flowchart_data JSONB NOT NULL, -- Data struktur node & edge (contoh: format Mermaid atau React Flow)
    markdown_content TEXT NOT NULL, -- Penjelasan naratif rinci
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing sederhana untuk performa query
CREATE INDEX idx_screening_sessions_user ON screening_sessions(user_id);
CREATE INDEX idx_screening_qa_session ON screening_qa(session_id);
CREATE INDEX idx_career_plans_user ON career_plans(user_id);


4. Contoh Struktur Data Flowchart (JSONB)

Agar frontend (misalnya menggunakan library Mermaid.js atau React Flow) mudah merender flowchart, AI dapat mengembalikan output JSON terstruktur seperti berikut:

{
  "nodes": [
    { "id": "1", "label": "Dasar Programming & Git", "type": "start" },
    { "id": "2", "label": "Pelajari Node.js & Express", "type": "step" },
    { "id": "3", "label": "Kuasai PostgreSQL & ORM", "type": "step" },
    { "id": "4", "label": "Junior Backend Developer", "type": "milestone" }
  ],
  "edges": [
    { "source": "1", "target": "2" },
    { "source": "2", "target": "3" },
    { "source": "3", "target": "4" }
  ]
}
