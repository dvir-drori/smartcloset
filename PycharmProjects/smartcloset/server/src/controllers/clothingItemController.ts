import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { createThumbnail, getImageUrl, deleteImage } from '../services/imageService';

const clothingCategories = ['TOP', 'BOTTOM', 'OUTERWEAR', 'SHOES', 'ACCESSORY', 'UNDERWEAR', 'SWIMWEAR', 'FORMAL'] as const;
const patterns = ['SOLID', 'STRIPED', 'PLAID', 'FLORAL', 'PRINTED', 'OTHER'] as const;
const seasons = ['SPRING', 'SUMMER', 'FALL', 'WINTER'] as const;
const occasions = ['CASUAL', 'WORK', 'FORMAL', 'SPORT', 'GOING_OUT'] as const;

// Helper to parse JSON string arrays from multipart form data
const jsonArrayPreprocess = (val: unknown) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
};

export const createClothingItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(clothingCategories),
  subcategory: z.string().min(1, 'Subcategory is required'),
  color: z.string().min(1, 'Color is required'),
  secondaryColor: z.string().optional(),
  pattern: z.enum(patterns).optional(),
  material: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  season: z.preprocess(jsonArrayPreprocess, z.array(z.enum(seasons)).optional()),
  occasion: z.preprocess(jsonArrayPreprocess, z.array(z.enum(occasions)).optional()),
});

export const updateClothingItemSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(clothingCategories).optional(),
  subcategory: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  secondaryColor: z.string().nullable().optional(),
  pattern: z.enum(patterns).optional(),
  material: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  season: z.preprocess(jsonArrayPreprocess, z.array(z.enum(seasons)).optional()),
  occasion: z.preprocess(jsonArrayPreprocess, z.array(z.enum(occasions)).optional()),
  isFavorite: z.preprocess((v) => v === 'true' ? true : v === 'false' ? false : v, z.boolean().optional()),
});

export async function createClothingItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    const body = req.body as z.infer<typeof createClothingItemSchema>;
    const imageUrl = getImageUrl(file.filename);
    const thumbnailUrl = await createThumbnail(file.filename);

    const item = await prisma.clothingItem.create({
      data: {
        userId,
        name: body.name,
        category: body.category,
        subcategory: body.subcategory,
        color: body.color,
        secondaryColor: body.secondaryColor,
        pattern: body.pattern ?? 'SOLID',
        material: body.material,
        brand: body.brand,
        size: body.size,
        season: JSON.stringify(body.season ?? []),
        occasion: JSON.stringify(body.occasion ?? []),
        imageUrl,
        thumbnailUrl,
      },
    });

    res.status(201).json({
      ...item,
      season: JSON.parse(item.season),
      occasion: JSON.parse(item.occasion),
    });
  } catch (error) {
    console.error('Create clothing item error:', error);
    res.status(500).json({ error: 'Failed to create clothing item' });
  }
}

export async function getClothingItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const category = req.query.category as string | undefined;
    const favorite = req.query.favorite as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = { userId };
    if (category) where.category = category;
    if (favorite === 'true') where.isFavorite = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { color: { contains: search } },
        { subcategory: { contains: search } },
      ];
    }

    const items = await prisma.clothingItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(items.map((item) => ({
      ...item,
      season: JSON.parse(item.season),
      occasion: JSON.parse(item.occasion),
    })));
  } catch (error) {
    console.error('Get clothing items error:', error);
    res.status(500).json({ error: 'Failed to get clothing items' });
  }
}

export async function getClothingItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const item = await prisma.clothingItem.findUnique({ where: { id } });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (item.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    res.json({
      ...item,
      season: JSON.parse(item.season),
      occasion: JSON.parse(item.occasion),
    });
  } catch (error) {
    console.error('Get clothing item error:', error);
    res.status(500).json({ error: 'Failed to get clothing item' });
  }
}

export async function updateClothingItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.clothingItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const body = req.body as z.infer<typeof updateClothingItemSchema>;
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.subcategory !== undefined) data.subcategory = body.subcategory;
    if (body.color !== undefined) data.color = body.color;
    if (body.secondaryColor !== undefined) data.secondaryColor = body.secondaryColor;
    if (body.pattern !== undefined) data.pattern = body.pattern;
    if (body.material !== undefined) data.material = body.material;
    if (body.brand !== undefined) data.brand = body.brand;
    if (body.size !== undefined) data.size = body.size;
    if (body.season !== undefined) data.season = JSON.stringify(body.season);
    if (body.occasion !== undefined) data.occasion = JSON.stringify(body.occasion);
    if (body.isFavorite !== undefined) data.isFavorite = body.isFavorite;

    // Handle image replacement
    if (req.file) {
      const imageUrl = getImageUrl(req.file.filename);
      const thumbnailUrl = await createThumbnail(req.file.filename);
      data.imageUrl = imageUrl;
      data.thumbnailUrl = thumbnailUrl;
      deleteImage(existing.imageUrl);
    }

    const item = await prisma.clothingItem.update({
      where: { id },
      data,
    });

    res.json({
      ...item,
      season: JSON.parse(item.season),
      occasion: JSON.parse(item.occasion),
    });
  } catch (error) {
    console.error('Update clothing item error:', error);
    res.status(500).json({ error: 'Failed to update clothing item' });
  }
}

export async function deleteClothingItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (item.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.clothingItem.delete({ where: { id } });
    deleteImage(item.imageUrl);

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete clothing item error:', error);
    res.status(500).json({ error: 'Failed to delete clothing item' });
  }
}

export async function toggleFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (item.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updated = await prisma.clothingItem.update({
      where: { id },
      data: { isFavorite: !item.isFavorite },
    });

    res.json({
      ...updated,
      season: JSON.parse(updated.season),
      occasion: JSON.parse(updated.occasion),
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
}
