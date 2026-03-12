import { env } from "../config/env";
import { createCircuitBreaker } from "../utils/circuit-breaker";

function requireCloudflare() {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_IMAGES_API_TOKEN) {
    throw new Error("Cloudflare Images is not configured — set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_IMAGES_API_TOKEN");
  }
  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_IMAGES_API_TOKEN,
  };
}

export interface UploadResult {
  id: string;
  url: string;
  variants: string[];
}

/**
 * Internal: upload a file buffer to Cloudflare Images.
 */
async function _uploadToCloudflare(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const cf = requireCloudflare();
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("requireSignedURLs", "false");

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/images/v1`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cf.apiToken}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare Images upload failed: ${err}`);
  }

  const data = await res.json() as {
    success: boolean;
    result: { id: string; variants: string[] };
  };

  if (!data.success) {
    throw new Error("Cloudflare Images upload unsuccessful");
  }

  return {
    id: data.result.id,
    url: data.result.variants[0] ?? `https://imagedelivery.net/${cf.accountId}/${data.result.id}/public`,
    variants: data.result.variants,
  };
}

/**
 * Internal: delete an image from Cloudflare Images by ID.
 */
async function _deleteFromCloudflare(imageId: string): Promise<void> {
  const cf = requireCloudflare();
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/images/v1/${imageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${cf.apiToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare Images delete failed: ${err}`);
  }
}

const uploadBreaker = createCircuitBreaker(
  _uploadToCloudflare,
  "cloudflare-upload",
  { timeout: 30000 }
);

const deleteBreaker = createCircuitBreaker(
  _deleteFromCloudflare,
  "cloudflare-delete",
  { timeout: 15000 }
);

/**
 * Upload a file buffer to Cloudflare Images, protected by circuit breaker.
 * Returns the image ID and public variant URL.
 */
export async function uploadToCloudflare(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  return uploadBreaker.fire(buffer, filename, mimeType) as Promise<UploadResult>;
}

/**
 * Delete an image from Cloudflare Images by ID, protected by circuit breaker.
 */
export async function deleteFromCloudflare(imageId: string): Promise<void> {
  return deleteBreaker.fire(imageId) as Promise<void>;
}

/**
 * Extract Cloudflare image ID from a full variant URL.
 * e.g. https://imagedelivery.net/<hash>/<id>/public -> <id>
 */
export function extractImageId(url: string): string | null {
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)\//);
  return match?.[1] ?? null;
}
