import { Storage } from '@google-cloud/storage';
import { ENV } from './_core/env';
import path from 'path';

let storage: Storage;

function getStorageClient(): Storage {
  if (storage) return storage;

  const projectId = process.env.GCP_PROJECT_ID;
  const keyFilePath = process.env.GCP_KEY_FILE_PATH;

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID is not defined in .env");
  }

  // If a key file path is provided, use it; otherwise, rely on ADC (Application Default Credentials)
  if (keyFilePath) {
    storage = new Storage({
      projectId,
      keyFilename: path.resolve(process.cwd(), keyFilePath),
    });
  } else {
    storage = new Storage({ projectId });
  }

  return storage;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME is not defined in .env");
  }
  return getStorageClient().bucket(bucketName);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const bucket = getBucket();
  const file = bucket.file(key);

  const buffer = typeof data === 'string' 
    ? Buffer.from(data) 
    : Buffer.from(data as Uint8Array);

  await file.save(buffer, {
    contentType,
    resumable: false,
    public: true, // Make it public by default for simpler access
  });

  // Construct the public URL
  const url = `https://storage.googleapis.com/${bucket.name}/${key}`;

  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = normalizeKey(relKey);
  const bucket = getBucket();
  
  // For GCS, we return the public URL directly
  const url = `https://storage.googleapis.com/${bucket.name}/${key}`;

  return { key, url };
}
