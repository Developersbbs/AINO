import path from 'path';
import { randomUUID } from 'node:crypto';
import admin from '../config/firebase';

export async function uploadToFirebaseStorage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string,
): Promise<{ url: string; storagePath: string }> {
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error('FIREBASE_STORAGE_BUCKET env var is not set');
  }
  const bucket = admin.storage().bucket();
  const safeMimeType = mimeType || '';
  const safeName = originalName || 'document';
  const ext = path.extname(safeName) || (safeMimeType.includes('pdf') ? '.pdf' : '.jpg');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const storagePath = `${folder}/${unique}${ext}`;
  const downloadToken = randomUUID();

  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  // Token-authenticated URL — readable by anyone with the link, no Firebase auth needed
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
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
