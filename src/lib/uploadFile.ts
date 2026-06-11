import { supabase } from '@/db/supabase';

const BUCKET = 'course-assets';
const MAX_SIZE_MB = 50;

/**
 * Uploads a file to the course-assets Supabase Storage bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File exceeds ${MAX_SIZE_MB} MB limit.`);
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes a file from the bucket given its public URL. */
export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    // path after /object/public/course-assets/
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return;
    const filePath = decodeURIComponent(url.pathname.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([filePath]);
  } catch {
    // best-effort
  }
}
