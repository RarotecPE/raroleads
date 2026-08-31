import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "txt",
  "csv",
  "rtf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "tif",
  "tiff",
  "bmp",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
  "text/rtf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
]);

export interface StoredDocument {
  key: string;
  originalName: string;
  contentType: string;
  size: number;
}

function r2Config() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 nao configurado. Informe R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME.");
  }

  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function extensionOf(fileName: string) {
  const last = fileName.toLowerCase().split(".").pop();
  return last && last !== fileName.toLowerCase() ? last : "";
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "arquivo";
}

function assertAllowedFile(file: File) {
  if (file.size <= 0) throw new Error("Arquivo vazio nao pode ser anexado.");
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) throw new Error("Arquivo excede o limite de 20 MB.");

  const extension = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Formato de arquivo nao permitido. Anexe apenas documentos ou imagens.");
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Tipo de arquivo nao permitido. Anexe apenas documentos ou imagens.");
  }
}

export function fileFromFormData(fd: FormData, field = "arquivo") {
  const value = fd.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function uploadDocumentFile(file: File, municipioId: string, documentId: string): Promise<StoredDocument> {
  assertAllowedFile(file);
  const { bucket, client } = r2Config();
  const originalName = file.name || "arquivo";
  const contentType = file.type || "application/octet-stream";
  const key = `raroleads/${municipioId}/${documentId}-${sanitizeFileName(originalName)}`;
  const body = Buffer.from(await file.arrayBuffer());

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return {
    key,
    originalName,
    contentType,
    size: file.size,
  };
}

export async function deleteDocumentFile(key: string) {
  const { bucket, client } = r2Config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getDocumentFile(key: string) {
  const { bucket, client } = r2Config();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
