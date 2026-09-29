-- Career Path AI schema
-- Adapted from app_summary.md for Clerk + Supabase third-party auth:
-- authentication (password handling) is managed by Clerk, so user IDs are the
-- Clerk user ID (TEXT) and RLS uses auth.jwt() ->> 'sub'.

-- 1. Users (profile mirror of the Clerk user)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email VARCHAR(255),
  full_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Screening sessions
-- Status: 'DRAFT', 'AWAITING_AI_QUESTIONS', 'AWAITING_USER_ANSWERS', 'COMPLETED'
CREATE TABLE IF NOT EXISTS public.screening_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'AWAITING_AI_QUESTIONS', 'AWAITING_USER_ANSWERS', 'COMPLETED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Screening questions & answers (general + AI generated)
CREATE TABLE IF NOT EXISTS public.screening_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.screening_sessions(id) ON DELETE CASCADE,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('GENERAL', 'AI_GENERATED')),
  question_text TEXT NOT NULL,
  answer_text TEXT,
  order_index INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Career plans (final result)
CREATE TABLE IF NOT EXISTS public.career_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE NOT NULL REFERENCES public.screening_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  flowchart_data JSONB NOT NULL, -- { nodes: [...], edges: [...] }
  markdown_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_screening_sessions_user ON public.screening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_qa_session ON public.screening_qa(session_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_user ON public.career_plans(user_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own user row" ON public.users
  FOR ALL USING (auth.jwt() ->> 'sub' = id)
  WITH CHECK (auth.jwt() ->> 'sub' = id);

CREATE POLICY "Users can access own screening sessions" ON public.screening_sessions
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id)
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can access QA of own sessions" ON public.screening_qa
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.screening_sessions s
      WHERE s.id = session_id AND s.user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.screening_sessions s
      WHERE s.id = session_id AND s.user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can access own career plans" ON public.career_plans
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id)
  WITH CHECK (
    auth.jwt() ->> 'sub' = user_id AND
    EXISTS (
      SELECT 1 FROM public.screening_sessions s
      WHERE s.id = session_id AND s.user_id = auth.jwt() ->> 'sub'
    )
  );

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screening_sessions_updated_at
  BEFORE UPDATE ON public.screening_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
