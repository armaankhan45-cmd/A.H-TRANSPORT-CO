/**
 * Supabase client + storage helpers.
 *
 *   VITE_DATA_MODE=demo      (default) browser-only localStorage, DEMO LOGINS. Never use real data.
 *   VITE_DATA_MODE=supabase  real login (Supabase Auth), Postgres + RLS, private file storage.
 *
 * Only the ANON key is ever used here. The service-role key must never be in this app.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const DATA_MODE: "demo" | "supabase" =
  (import.meta.env.VITE_DATA_MODE as string | undefined) === "supabase" && url && anonKey ? "supabase" : "demo";

export const supabase: SupabaseClient | null = DATA_MODE === "supabase"
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export type Bucket = "vehicle-docs" | "driver-docs" | "receipts" | "invoices" | "photos";

/** Signed URLs for many paths in one bucket (1 hour). Returns path -> url. */
export async function signedUrls(bucket: Bucket, paths: string[], seconds = 3600): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!supabase || paths.length === 0) return out;
  const { data } = await supabase.storage.from(bucket).createSignedUrls([...new Set(paths)], seconds);
  (data || []).forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

export async function signedUrl(bucket: Bucket, path: string, seconds = 3600) {
  return (await signedUrls(bucket, [path], seconds))[path] ?? null;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Upload a data: URL (from the file picker) to a private bucket. Returns the storage path. */
export async function uploadDataUrl(bucket: Bucket, folder: string, dataUrl: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const blob = await (await fetch(dataUrl)).blob();
  const ext = EXT[blob.type];
  if (!ext) throw new Error("Only JPG, PNG, WEBP or PDF files are allowed");
  if (blob.size > 10 * 1024 * 1024) throw new Error("File is larger than 10 MB");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: false, contentType: blob.type });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** Atomic LR / TCC / TRIP number from the database. */
export async function nextDocumentNo(prefix: "LR" | "TCC" | "TRIP"): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("next_document_no", { p_prefix: prefix });
  if (error || !data) throw new Error(`Could not get ${prefix} number: ${error?.message ?? "empty"}`);
  return data as string;
}
