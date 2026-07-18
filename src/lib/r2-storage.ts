import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_EXPIRES_SECONDS = 10 * 60;
const READ_URL_EXPIRES_SECONDS = 15 * 60;

type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type ObjectMetadata = {
  contentLength: number;
  contentType: string;
  etag?: string;
};

let client: S3Client | null = null;
let corsReady: Promise<void> | null = null;

function getR2Config(): R2Config {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    bucketName: process.env.R2_BUCKET_NAME,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  }

  return config as R2Config;
}

function getAppOrigins() {
  const origins = new Set<string>([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  ]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // ignore invalid env URLs
    }
  }

  return [...origins];
}

function getR2Client() {
  if (client) return client;
  const config = getR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // AWS SDK v3 defaults add CRC32 checksum query params that break browser
    // PUT uploads to R2 (CORS preflight + signature mismatch).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function getBucketName() {
  return getR2Config().bucketName;
}

/** Ensure the bucket accepts browser PUTs/GETs from app origins. */
async function ensureBrowserCors() {
  if (!corsReady) {
    corsReady = (async () => {
      try {
        await getR2Client().send(
          new PutBucketCorsCommand({
            Bucket: getBucketName(),
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedOrigins: getAppOrigins(),
                  AllowedMethods: ["GET", "PUT", "HEAD"],
                  AllowedHeaders: ["*"],
                  ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
                  MaxAgeSeconds: 3600,
                },
              ],
            },
          }),
        );
      } catch (error) {
        // Don't block uploads if CORS update fails (permissions / already set).
        console.warn("Unable to update R2 CORS rules:", error);
      }
    })();
  }

  await corsReady;
}

function buildDocumentSourceKey(workspaceId: string, documentId: string) {
  return `workspaces/${workspaceId}/documents/${documentId}/source.pdf`;
}

function buildFinalizedKey(
  workspaceId: string,
  documentId: string,
  type: "session" | "packet" | "copy",
  id: string,
) {
  return `workspaces/${workspaceId}/documents/${documentId}/finalized/${type}-${id}.pdf`;
}

async function createUploadUrl(key: string) {
  await ensureBrowserCors();
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: "application/pdf",
    }),
    { expiresIn: UPLOAD_URL_EXPIRES_SECONDS },
  );
}

async function createReadUrl(
  key: string,
  options?: { downloadName?: string; inlineName?: string },
) {
  await ensureBrowserCors();
  const fileName = options?.downloadName || options?.inlineName;
  const disposition = fileName
    ? `${options?.downloadName ? "attachment" : "inline"}; filename="${fileName.replace(/"/g, "")}"`
    : undefined;

  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: READ_URL_EXPIRES_SECONDS },
  );
}

async function headObject(key: string): Promise<ObjectMetadata> {
  const response = await getR2Client().send(
    new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );

  return {
    contentLength: response.ContentLength || 0,
    contentType: response.ContentType || "",
    etag: response.ETag,
  };
}

async function getObjectBytes(key: string, range?: string) {
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Range: range,
    }),
  );

  return bodyToBytes(response.Body);
}

/** Stream an object for HTTP responses (supports Range for fast PDF opens). */
async function getR2ObjectStream(key: string, range?: string) {
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Range: range,
    }),
  );

  const body = response.Body;
  let stream: ReadableStream<Uint8Array> | null = null;

  if (body && typeof body === "object" && "transformToWebStream" in body) {
    stream = (
      body as { transformToWebStream: () => ReadableStream<Uint8Array> }
    ).transformToWebStream();
  } else if (
    body &&
    typeof body === "object" &&
    typeof ReadableStream !== "undefined" &&
    ReadableStream.prototype.isPrototypeOf(body)
  ) {
    stream = body as unknown as ReadableStream<Uint8Array>;
  } else if (body) {
    const bytes = await bodyToBytes(body);
    stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  return {
    body: stream,
    contentLength: response.ContentLength ?? null,
    contentRange: response.ContentRange ?? null,
    contentType: response.ContentType || "application/pdf",
  };
}

async function putObjectBytes(
  key: string,
  body: Uint8Array,
  options?: { contentDisposition?: string },
) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: "application/pdf",
      ContentDisposition: options?.contentDisposition,
    }),
  );
}

async function deleteObject(key: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
}

async function isPdfObject(key: string) {
  const bytes = await getObjectBytes(key, "bytes=0-4");
  return Buffer.from(bytes).toString("utf8") === "%PDF-";
}

async function bodyToBytes(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (body instanceof Uint8Array) return body;

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return body.transformToByteArray();
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<
    Uint8Array | Buffer | string
  >) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk);
    }
  }

  return Buffer.concat(chunks);
}

export {
  buildDocumentSourceKey,
  buildFinalizedKey,
  createReadUrl,
  createUploadUrl,
  deleteObject,
  getObjectBytes,
  getR2ObjectStream,
  headObject,
  isPdfObject,
  putObjectBytes,
};
