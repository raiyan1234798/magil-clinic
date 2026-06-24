/**
 * Optional Cloudflare R2 storage for patient documents.
 * When R2_* env vars are set, uploads go to R2; otherwise falls back to base64 in SQLite.
 */

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export async function uploadToR2(
  key: string,
  data: Buffer,
  mimeType: string
): Promise<string | null> {
  if (!isR2Configured()) return null;

  const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: data,
      ContentType: mimeType,
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL;
  if (publicBase) return `${publicBase.replace(/\/$/, '')}/${key}`;
  return `r2://${process.env.R2_BUCKET_NAME}/${key}`;
}

export function parseBase64File(fileData: string): { buffer: Buffer; mimeType: string } | null {
  const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}
