import path from 'path';
import admin from '../config/firebase';

export async function uploadToFirebaseStorage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string,
): Promise<{ url: string; storagePath: string }> {
  const bucket = admin.storage().bucket();
  const ext = path.extname(originalName) || (mimeType.includes('pdf') ? '.pdf' : '.jpg');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const storagePath = `${folder}/${unique}${ext}`;

  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType: mimeType } });
  await file.makePublic();

  const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return { url, storagePath };
}

export async function deleteFromFirebaseStorage(storagePath: string): Promise<void> {
  try {
    const bucket = admin.storage().bucket();
    await bucket.file(storagePath).delete();
  } catch {
    // File may not exist (e.g. old local-disk documents) — ignore
  }
}
