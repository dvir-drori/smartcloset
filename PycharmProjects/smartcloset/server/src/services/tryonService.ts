import { Client, handle_file } from '@gradio/client';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { getTryOnDir } from './imageService';

const HF_SPACE = 'yisol/IDM-VTON';
const TRYON_INPUT_MAX = 768; // Max dimension for model input
const DENOISING_STEPS = 20; // 20 steps is ~33% faster with minimal quality loss vs 30

// Persistent client cache to avoid reconnecting every request (~3-5s saved)
let cachedClient: Client | null = null;
let clientExpiry = 0;
const CLIENT_TTL = 10 * 60 * 1000; // 10 minutes

async function getClient(): Promise<Client> {
  if (cachedClient && Date.now() < clientExpiry) {
    return cachedClient;
  }

  const options: { token?: `hf_${string}` } = {};
  if (process.env.HF_TOKEN) {
    options.token = process.env.HF_TOKEN as `hf_${string}`;
  }

  cachedClient = await Client.connect(HF_SPACE, options);
  clientExpiry = Date.now() + CLIENT_TTL;
  return cachedClient;
}

// Reset cached client on error so next request reconnects
function resetClient(): void {
  cachedClient = null;
  clientExpiry = 0;
}

// Pre-resize images to reduce upload time and API processing
async function prepareInputImage(imagePath: string): Promise<string> {
  const tempPath = path.join(getTryOnDir(), `input_${uuidv4()}.jpg`);

  await sharp(imagePath)
    .resize(TRYON_INPUT_MAX, TRYON_INPUT_MAX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toFile(tempPath);

  return tempPath;
}

export type TryOnProgressCallback = (stage: string) => void;

export async function generateTryOn(
  bodyPhotoPath: string,
  garmentImagePath: string,
  garmentDescription: string,
  onProgress?: TryOnProgressCallback,
): Promise<string> {
  const tempFiles: string[] = [];

  try {
    // Stage 1: Prepare images
    onProgress?.('Preparing images...');
    const [preparedBody, preparedGarment] = await Promise.all([
      prepareInputImage(bodyPhotoPath),
      prepareInputImage(garmentImagePath),
    ]);
    tempFiles.push(preparedBody, preparedGarment);

    // Stage 2: Connect
    onProgress?.('Connecting to AI model...');
    let client: Client;
    try {
      client = await getClient();
    } catch (err) {
      resetClient();
      throw err;
    }

    // Stage 3: Generate
    onProgress?.('Generating try-on preview...');
    let result;
    try {
      result = await client.predict('/tryon', [
        { background: handle_file(preparedBody), layers: [], composite: null },
        handle_file(preparedGarment),
        garmentDescription,
        true,  // auto-generated mask
        true,  // auto-crop & resizing
        DENOISING_STEPS,
        42,    // seed
      ]);
    } catch (err) {
      resetClient();
      throw err;
    }

    const data = result.data as Array<{ url?: string; path?: string }>;
    if (!data || data.length === 0) {
      throw new Error('No result returned from try-on model');
    }

    const outputInfo = data[0];
    const imageUrl = outputInfo.url || outputInfo.path;
    if (!imageUrl) {
      throw new Error('No image URL in try-on result');
    }

    // Stage 4: Download result
    onProgress?.('Downloading result...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download try-on result: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `tryon_${uuidv4()}.jpg`;
    const outputPath = path.join(getTryOnDir(), filename);
    fs.writeFileSync(outputPath, buffer);

    onProgress?.('Done!');
    return `/uploads/tryon/${filename}`;
  } finally {
    // Clean up temp preprocessed images
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
}
