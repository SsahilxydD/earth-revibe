import { env } from "../config/env";

const CF_UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

export interface UploadResult {
  id: string;
  url: string;
  variants: string[];
}

/**
 * Upload a file buffer to Cloudflare Images.
 * Returns the image ID and public variant URL.
 */
export async function uploadToCloudflare(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("file", blob, filename);
  formData.append("requireSignedURLs", "false");

  const res = await fetch(CF_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`,
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
    url: data.result.variants[0] ?? `https://imagedelivery.net/${env.CLOUDFLARE_ACCOUNT_ID}/${data.result.id}/public`,
    variants: data.result.variants,
  };
}

/**
 * Delete an image from Cloudflare Images by ID.
 */
export async function deleteFromCloudflare(imageId: string): Promise<void> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare Images delete failed: ${err}`);
  }
}

/**
 * Extract Cloudflare image ID from a full variant URL.
 * e.g. https://imagedelivery.net/<hash>/<id>/public → <id>
 */
export function extractImageId(url: string): string | null {
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)\//);
  return match?.[1] ?? null;
}
