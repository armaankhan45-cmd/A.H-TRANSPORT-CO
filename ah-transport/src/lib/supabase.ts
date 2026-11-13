/**
 * Supabase client + relational repository (production data layer).
 *
 * DATA MODES
 *   VITE_DATA_MODE=demo      (default) — the app persists to localStorage.
 *                            Zero setup, works offline, ideal for evaluation.
 *   VITE_DATA_MODE=supabase  — the app talks to Supabase (Postgres + Auth +
 *                            private Storage). Requires the migrations in
 *                            /supabase/migrations to be applied and the
 *                            environment variables below to be set.
 *
 * SECURITY
 *   Only the ANON key is ever exposed to the browser. Row Level Security is
 *   enforced server-side by 0002_rls.sql, so the anon key cannot read rows the
 *   signed-in user is not entitled to. The service-role key must NEVER be
 *   placed in this frontend — use it only inside Supabase Edge Functions.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const DATA_MODE: "demo" | "supabase" =
  (import.meta.env.VITE_DATA_MODE as string | undefined) === "supabase" && url && anonKey ? "supabase" : "demo";

export const supabase: SupabaseClient | null = DATA_MODE === "supabase" ? createClient(url!, anonKey!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

/** Signed URL helper — private buckets only; links expire in 60 seconds. */
export async function signedUrl(bucket: "vehicle-docs" | "driver-docs" | "receipts" | "invoices" | "photos", path: string, seconds = 60) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadPrivate(bucket: "vehicle-docs" | "driver-docs" | "receipts" | "invoices" | "photos", path: string, file: File) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

/* ------------------------------------------------------------------ *
 * READ REPOSITORY — maps the relational schema onto the app's DB shape
 * ------------------------------------------------------------------ */
export async function pullAll() {
  if (!supabase) throw new Error("Supabase is not configured");
  const q = <T,>(t: string) => supabase!.from(t).select("*").then((r) => (r.data || []) as T[]);
  const [vehicles, vehicleDocs, maintenance, drivers, assignments, customers, trips, lrs, tccs, salaries, expenses, locations] = await Promise.all([
    q<any>("vehicles"), q<any>("vehicle_documents"), q<any>("vehicle_maintenance"), q<any>("drivers"),
    q<any>("driver_assignments"), q<any>("customers"), q<any>("trips"), q<any>("lr_documents"),
    q<any>("tcc_documents"), q<any>("salary_records"), q<any>("expenses"), q<any>("driver_locations"),
  ]);
  return { vehicles, vehicleDocs, maintenance, drivers, assignments, customers, trips, lrs, tccs, salaries, expenses, locations };
}

/** Next sequential LR / TCC / TRIP number from the database (concurrency-safe). */
export async function nextDocumentNo(prefix: "LR" | "TCC" | "TRIP") {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("next_document_no", { p_prefix: prefix });
  return error ? null : (data as string);
}

/** Audit helper — mirrors src/store.tsx write path. */
export async function audit(action: string, entity: string, entityId: string | null, detail: Record<string, unknown> = {}) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({ actor_id: user?.id ?? null, actor_name: user?.email ?? "system", action, entity, entity_id: entityId, detail });
}
