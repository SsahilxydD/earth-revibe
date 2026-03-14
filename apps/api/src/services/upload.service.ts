import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import { createCircuitBreaker } from "../utils/circuit-breaker";
import { ApiError } from "../utils/api-error";
import { logger } from "../config/logger";

// ─── Provider detection ──────────────────────────────────────────────────────

const useCloudflare = !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_IMAGES_API_TOKEN);

export const imageProvider = useCloudflare ? "cloudflare" : "supabase";

export interface UploadResult {
  id: string;
  url: string;
  provider: "cloudflare" | "supabase";
  variants: string[];
}

// ─── Supabase Storage ────────────────────────────────────────────────────────

const BUCKET = "product-images";

function getSupabaseAdmin() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Ensure the storage bucket exists (called once on first upload) */
let bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    if (error && !error.message.includes("already exists")) {
      throw ApiError.internal(`Failed to create storage bucket: ${error.message}`);
    }
  }
  bucketReady = true;
}

async function _uploadToSupabase(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  await ensureBucket();

  const supabase = getSupabaseAdmin();
  const ext = filename.split(".").pop() || "jpg";
  const storagePath = `${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      cacheControl: "31536000", // 1 year
      upsert: false,
    });

  if (error) {
    throw ApiError.internal(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return {
    id: storagePath,
    url: urlData.publicUrl,
    provider: "supabase",
    variants: [urlData.publicUrl],
  };
}

async function _deleteFromSupabase(imageId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).remove([imageId]);
  if (error) {
    logger.warn({ imageId, error: error.message }, "Failed to delete image from Supabase Storage");
  }
}

// ─── Cloudflare Images ───────────────────────────────────────────────────────

async function _uploadToCloudflare(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("requireSignedURLs", "false");

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}` },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw ApiError.serviceUnavailable(`Cloudflare Images upload failed: ${res.status} — ${err}`);
  }

  const data = (await res.json()) as {
    success: boolean;
    result: { id: string; variants: string[] };
  };

  if (!data.success) {
    throw ApiError.serviceUnavailable("Cloudflare Images upload unsuccessful");
  }

  return {
    id: data.result.id,
    url:
      data.result.variants[0] ??
      `https://imagedelivery.net/${env.CLOUDFLARE_ACCOUNT_ID}/${data.result.id}/public`,
    provider: "cloudflare",
    variants: data.result.variants,
  };
}

async function _deleteFromCloudflare(imageId: string): Promise<void> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    logger.warn({ imageId, err }, "Cloudflare Images delete failed");
  }
}

// ─── Circuit breakers ────────────────────────────────────────────────────────

const uploadBreaker = createCircuitBreaker(
  useCloudflare ? _uploadToCloudflare : _uploadToSupabase,
  useCloudflare ? "cloudflare-upload" : "supabase-upload",
  { timeout: 30000 }
);

const deleteBreaker = createCircuitBreaker(
  useCloudflare ? _deleteFromCloudflare : _deleteFromSupabase,
  useCloudflare ? "cloudflare-delete" : "supabase-delete",
  { timeout: 15000 }
);

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Upload an image. Automatically uses Cloudflare Images if configured,
 * otherwise falls back to Supabase Storage.
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  return uploadBreaker.fire(buffer, filename, mimeType) as Promise<UploadResult>;
}

/**
 * Delete an image by ID. Routes to the correct provider based on the ID format.
 * - Supabase IDs contain a dot (uuid.ext)
 * - Cloudflare IDs are UUIDs without extension
 */
export async function deleteImage(imageId: string): Promise<void> {
  return deleteBreaker.fire(imageId) as Promise<void>;
}

/**
 * Extract image ID from a URL (works for both providers).
 */
export function extractImageId(url: string): string | null {
  // Cloudflare: https://imagedelivery.net/<hash>/<id>/public
  const cfMatch = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)\//);
  if (cfMatch) return cfMatch[1];

  // Supabase: https://<project>.supabase.co/storage/v1/object/public/product-images/<id>
  const sbMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (sbMatch) return sbMatch[1];

  return null;
}

// ─── Legacy exports (backward compat) ────────────────────────────────────────

/** @deprecated Use uploadImage() instead */
export const uploadToCloudflare = uploadImage;

/** @deprecated Use deleteImage() instead */
export const deleteFromCloudflare = deleteImage;
