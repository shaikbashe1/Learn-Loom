import { storage } from '@/db/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const BUCKET = 'course-assets';
const MAX_SIZE_MB = 50;

/**
 * Uploads a file to the course-assets Firebase Storage bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File exceeds ${MAX_SIZE_MB} MB limit.`);
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${BUCKET}/${folder}/${Date.now()}_${safeName}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });

  const url = await getDownloadURL(storageRef);
  return url;
}

/** Deletes a file from the bucket given its public URL. */
export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, publicUrl);
    await deleteObject(fileRef);
  } catch {
    // best-effort
  }
}
