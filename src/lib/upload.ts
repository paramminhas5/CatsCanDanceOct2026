/**
 * File upload utilities — Supabase Storage.
 *
 * Bucket: "posters" (public, must be created in Supabase dashboard).
 * Files are stored at: posters/{slug}/{timestamp}-{filename}
 *
 * Setup (run once in Supabase SQL Editor):
 *   INSERT INTO storage.buckets (id, name, public) VALUES ('posters', 'posters', true);
 *   CREATE POLICY "Public read posters" ON storage.objects FOR SELECT USING (bucket_id = 'posters');
 *   CREATE POLICY "Admin upload posters" ON storage.objects FOR INSERT
 *     WITH CHECK (bucket_id = 'posters' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
 *   CREATE POLICY "Admin delete posters" ON storage.objects FOR DELETE
 *     USING (bucket_id = 'posters' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
 */
import { supabase } from "@/lib/supabase";

const BUCKET = "posters";

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to the posters bucket.
 * @param file - The File object from an <input type="file">
 * @param folder - Optional folder prefix (e.g. event slug)
 * @returns Public URL and storage path, or throws on error.
 */
export async function uploadPoster(file: File, folder?: string): Promise<UploadResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const safeName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  const path = folder
    ? `${folder}/${timestamp}-${safeName}`
    : `${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path,
  };
}

/**
 * Delete a file from the posters bucket by its path.
 */
export async function deletePoster(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
