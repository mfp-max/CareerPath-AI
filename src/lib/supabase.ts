import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// The publishable key (sb_publishable_...) is the successor of the anon key; accept either name.
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getMissingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)");
  }
  return missing;
}

function requireConfig() {
  const missing = getMissingSupabaseEnv();
  if (missing.length > 0) {
    throw new Error(
      `Supabase belum dikonfigurasi. Tambahkan ${missing.join(" dan ")} ke .env.local lalu restart server.`,
    );
  }
  return { url: supabaseUrl!, key: supabaseKey! };
}

const noStoreFetch: typeof fetch = (url, options = {}) =>
  fetch(url, { ...options, cache: "no-store" });

/** Plain client without a Clerk token (RLS-protected tables will return no rows). */
export function getSupabaseClient() {
  const { url, key } = requireConfig();
  return createClient(url, key, { global: { fetch: noStoreFetch } });
}

export async function createSupabaseServerClient() {
  const { url, key } = requireConfig();
  const { getToken } = await auth();
  const token = await getToken();

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      fetch: noStoreFetch,
    },
  });
}
