import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type Body = Buffer | Readable;
export interface Storage {
  put(key: string, body: Body, contentType: string, size: number): Promise<void>;
  get(key: string): Promise<{ body: Readable; size?: number } | null>;
  delete(key: string): Promise<void>;
}

export function localStorage(dir: string): Storage {
  const full = (key: string) => {
    const p = path.resolve(dir, key);
    if (!p.startsWith(path.resolve(dir) + path.sep)) throw new Error("bad key");
    return p;
  };
  return {
    async put(key, body) {
      const p = full(key);
      await mkdir(path.dirname(p), { recursive: true });
      await pipeline(Buffer.isBuffer(body) ? Readable.from([body]) : body, createWriteStream(p));
    },
    async get(key) {
      try {
        const p = full(key);
        const s = await stat(p);
        return { body: createReadStream(p), size: s.size };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await rm(full(key), { force: true });
    },
  };
}

export function s3Storage(env: NodeJS.ProcessEnv = process.env): Storage {
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY!, secretAccessKey: env.S3_SECRET_KEY! },
  });
  const Bucket = env.S3_BUCKET!;
  return {
    async put(key, body, contentType, size) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType, ContentLength: size }));
    },
    async get(key) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return { body: r.Body as Readable, size: r.ContentLength };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
  };
}

let cached: Storage | undefined;
export function getStorage(): Storage {
  if (!cached) cached = process.env.S3_BUCKET ? s3Storage() : localStorage(process.env.UPLOAD_DIR || "./uploads");
  return cached;
}
