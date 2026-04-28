import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

declare global {
  // eslint-disable-next-line no-var
  var __r2__: S3Client | undefined;
}

function readEnv(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
} {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 credentials are missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET).");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function getR2(): { client: S3Client; bucket: string } {
  const env = readEnv();
  if (!globalThis.__r2__) {
    globalThis.__r2__ = new S3Client({
      region: "auto",
      endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
  }
  return { client: globalThis.__r2__, bucket: env.bucket };
}

export function videoKey(args: {
  orgId: string;
  interviewId: string;
  questionId: string;
  attemptNumber: number;
  ext?: string;
}): string {
  const ext = args.ext ?? "webm";
  return `org/${args.orgId}/interviews/${args.interviewId}/q/${args.questionId}/take-${args.attemptNumber}-${Date.now()}.${ext}`;
}

export async function presignPut(args: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { client, bucket } = getR2();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: args.key,
    ContentType: args.contentType,
  });
  return getSignedUrl(client, cmd, { expiresIn: args.expiresInSeconds ?? 60 * 60 });
}

export async function presignGet(args: {
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { client, bucket } = getR2();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: args.key });
  return getSignedUrl(client, cmd, { expiresIn: args.expiresInSeconds ?? 60 * 60 * 4 });
}

export async function objectExists(key: string): Promise<{ exists: boolean; size?: number }> {
  const { client, bucket } = getR2();
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { exists: true, size: res.ContentLength };
  } catch (e) {
    if (typeof e === "object" && e && "$metadata" in e) {
      const meta = (e as { $metadata?: { httpStatusCode?: number } }).$metadata;
      if (meta?.httpStatusCode === 404) return { exists: false };
    }
    throw e;
  }
}
