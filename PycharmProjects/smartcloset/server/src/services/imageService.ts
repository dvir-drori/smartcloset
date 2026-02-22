import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const TRYON_DIR = path.join(UPLOAD_DIR, 'tryon');
const THUMBNAIL_SIZE = 300;
const MAX_IMAGE_DIMENSION = 1200; // Max dimension for uploaded images

export function ensureUploadDirs(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  }
  if (!fs.existsSync(TRYON_DIR)) {
    fs.mkdirSync(TRYON_DIR, { recursive: true });
  }
}

export function getTryOnDir(): string {
  return TRYON_DIR;
}

export function deleteTryOnImage(resultImageUrl: string): void {
  const filename = path.basename(resultImageUrl);
  const filePath = path.join(TRYON_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// Optimize uploaded images: resize large photos and compress
export async function optimizeUploadedImage(filename: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, filename);
  const tempPath = filePath + '.tmp';

  try {
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Only optimize if image is larger than our max
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      await sharp(filePath)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(tempPath);

      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
    }
  } catch {
    // If optimization fails, keep original
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
  }
}

export async function createThumbnail(filename: string): Promise<string> {
  const inputPath = path.join(UPLOAD_DIR, filename);
  const thumbFilename = `thumb_${filename}`;
  const outputPath = path.join(THUMBNAIL_DIR, thumbFilename);

  await sharp(inputPath)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  return `/uploads/thumbnails/${thumbFilename}`;
}

export function getImageUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export function getThumbnailUrl(filename: string): string {
  return `/uploads/thumbnails/thumb_${filename}`;
}

export function deleteImage(imageUrl: string): void {
  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOAD_DIR, filename);
  const thumbPath = path.join(THUMBNAIL_DIR, `thumb_${filename}`);

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
}
