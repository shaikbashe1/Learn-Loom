const CLOUD_NAME = 'nw8kqt5k';
const UPLOAD_PRESET = 'ml_default';

/**
 * Uploads a file to Cloudinary.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File, folder?: string): Promise<string> {
  const MAX_SIZE_MB = 50;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File exceeds ${MAX_SIZE_MB} MB limit.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to upload to Cloudinary');
  }

  const data = await res.json();
  return data.secure_url;
}

/** Deletes a file given its public URL. (No-op for Cloudinary unsigned uploads) */
export async function deleteFile(publicUrl: string): Promise<void> {
  // Unsigned client-side uploads do not allow deletion for security reasons.
  // Best effort: do nothing.
}
