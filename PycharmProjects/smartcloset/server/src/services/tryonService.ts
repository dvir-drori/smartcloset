import { Client, handle_file } from '@gradio/client';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getTryOnDir } from './imageService';

const HF_SPACE = 'yisol/IDM-VTON';

async function getClient(): Promise<Client> {
  const options: { token?: `hf_${string}` } = {};
  if (process.env.HF_TOKEN) {
    options.token = process.env.HF_TOKEN as `hf_${string}`;
  }
  return Client.connect(HF_SPACE, options);
}

export async function generateTryOn(
  bodyPhotoPath: string,
  garmentImagePath: string,
  garmentDescription: string
): Promise<string> {
  const client = await getClient();

  const result = await client.predict('/tryon', [
    handle_file(bodyPhotoPath),    // person image
    handle_file(garmentImagePath), // garment image
    garmentDescription,            // garment description
    true,                          // auto-generated mask
    true,                          // auto-crop & resizing
    30,                            // denoising steps
    42,                            // seed
  ]);

  const data = result.data as Array<{ url?: string; path?: string }>;
  if (!data || data.length === 0) {
    throw new Error('No result returned from try-on model');
  }

  const outputInfo = data[0];
  const imageUrl = outputInfo.url || outputInfo.path;
  if (!imageUrl) {
    throw new Error('No image URL in try-on result');
  }

  // Download the result image from HF temporary URL
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download try-on result: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `tryon_${uuidv4()}.jpg`;
  const outputPath = path.join(getTryOnDir(), filename);
  fs.writeFileSync(outputPath, buffer);

  return `/uploads/tryon/${filename}`;
}
