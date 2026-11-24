import "server-only";
import sharp, { type Metadata } from "sharp";

/**
 * Upload validation and re-encoding. The declared MIME type and file name are never trusted:
 * the format is read from the file's own bytes, then decoded and re-encoded with sharp (the
 * image library Next.js already uses), which also strips EXIF/GPS metadata. SVG and every other
 * format is refused.
 */
export const MEDIA_MAX_BYTES = 15 * 1024 * 1024;
export const MEDIA_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const MAX_EDGE = 2560;
const MAX_INPUT_PIXELS = 60_000_000;

export class MediaRejected extends Error {}

export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

/** Format from magic bytes, or null (SVG/XML, GIF, HEIC, PDF, text and everything else). */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (bytes.length >= 12 && ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  return null;
}

export type ProcessedImage = { data: Uint8Array; contentType: "image/webp"; extension: "webp"; width: number; height: number; blurDataUrl: string; sourceFormat: ImageFormat };

export async function processUpload(bytes: Uint8Array): Promise<ProcessedImage> {
  if (!bytes.length) throw new MediaRejected("The file is empty.");
  if (bytes.length > MEDIA_MAX_BYTES) throw new MediaRejected("Images must be 15 MB or smaller.");
  const format = sniffImageFormat(bytes);
  if (!format) throw new MediaRejected("Only JPEG, PNG, WebP or AVIF images are accepted (SVG is not).");
  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new MediaRejected("The image could not be read. It may be damaged.");
  }
  const decoded = metadata.format === "heif" ? "avif" : metadata.format;
  if (decoded !== format || !metadata.width || !metadata.height) throw new MediaRejected("The file's contents do not match an accepted image format.");
  try {
    const pipeline = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    const { data, info } = await pipeline
      .clone()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const blur = await pipeline.clone().resize({ width: 16, height: 16, fit: "inside" }).webp({ quality: 40 }).toBuffer();
    return {
      data,
      contentType: "image/webp",
      extension: "webp",
      width: info.width,
      height: info.height,
      blurDataUrl: `data:image/webp;base64,${btoa(String.fromCharCode(...blur))}`,
      sourceFormat: format,
    };
  } catch {
    throw new MediaRejected("The image could not be processed.");
  }
}
