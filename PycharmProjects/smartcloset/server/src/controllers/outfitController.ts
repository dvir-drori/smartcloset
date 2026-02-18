import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';

const occasions = ['CASUAL', 'WORK', 'FORMAL', 'SPORT', 'GOING_OUT'] as const;
const seasonValues = ['SPRING', 'SUMMER', 'FALL', 'WINTER'] as const;

export const createOutfitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  occasion: z.enum(occasions),
  season: z.array(z.enum(seasonValues)).optional(),
  itemIds: z.array(z.string().uuid()).min(1, 'At least one clothing item is required'),
});

export const updateOutfitSchema = z.object({
  name: z.string().min(1).optional(),
  occasion: z.enum(occasions).optional(),
  season: z.array(z.enum(seasonValues)).optional(),
  rating: z.number().min(1).max(5).optional(),
  itemIds: z.array(z.string().uuid()).min(1).optional(),
});

function parseItemJson(item: { season: string; occasion: string; [key: string]: unknown }) {
  return { ...item, season: JSON.parse(item.season), occasion: JSON.parse(item.occasion) };
}

export async function createOutfit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const body = req.body as z.infer<typeof createOutfitSchema>;

    // Verify all items belong to this user
    const items = await prisma.clothingItem.findMany({
      where: { id: { in: body.itemIds }, userId },
    });

    if (items.length !== body.itemIds.length) {
      res.status(400).json({ error: 'One or more clothing items not found' });
      return;
    }

    const outfit = await prisma.outfit.create({
      data: {
        userId,
        name: body.name,
        occasion: body.occasion,
        season: JSON.stringify(body.season ?? []),
        items: { connect: body.itemIds.map((id) => ({ id })) },
      },
      include: { items: true },
    });

    res.status(201).json({
      ...outfit,
      season: JSON.parse(outfit.season),
      items: outfit.items.map(parseItemJson),
    });
  } catch (error) {
    console.error('Create outfit error:', error);
    res.status(500).json({ error: 'Failed to create outfit' });
  }
}

export async function getOutfits(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const occasion = req.query.occasion as string | undefined;

    const where: Record<string, unknown> = { userId };
    if (occasion) where.occasion = occasion;

    const outfits = await prisma.outfit.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(outfits.map((outfit) => ({
      ...outfit,
      season: JSON.parse(outfit.season),
      items: outfit.items.map(parseItemJson),
    })));
  } catch (error) {
    console.error('Get outfits error:', error);
    res.status(500).json({ error: 'Failed to get outfits' });
  }
}

export async function getOutfit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const outfit = await prisma.outfit.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!outfit) {
      res.status(404).json({ error: 'Outfit not found' });
      return;
    }
    if (outfit.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    res.json({
      ...outfit,
      season: JSON.parse(outfit.season),
      items: outfit.items.map(parseItemJson),
    });
  } catch (error) {
    console.error('Get outfit error:', error);
    res.status(500).json({ error: 'Failed to get outfit' });
  }
}

export async function updateOutfit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const existing = await prisma.outfit.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Outfit not found' });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const body = req.body as z.infer<typeof updateOutfitSchema>;
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.occasion !== undefined) data.occasion = body.occasion;
    if (body.season !== undefined) data.season = JSON.stringify(body.season);
    if (body.rating !== undefined) data.rating = body.rating;

    // Handle item updates
    if (body.itemIds) {
      const items = await prisma.clothingItem.findMany({
        where: { id: { in: body.itemIds }, userId },
      });
      if (items.length !== body.itemIds.length) {
        res.status(400).json({ error: 'One or more clothing items not found' });
        return;
      }
    }

    const outfit = await prisma.outfit.update({
      where: { id },
      data: {
        ...data,
        ...(body.itemIds && {
          items: {
            set: body.itemIds.map((itemId) => ({ id: itemId })),
          },
        }),
      },
      include: { items: true },
    });

    res.json({
      ...outfit,
      season: JSON.parse(outfit.season),
      items: outfit.items.map(parseItemJson),
    });
  } catch (error) {
    console.error('Update outfit error:', error);
    res.status(500).json({ error: 'Failed to update outfit' });
  }
}

export async function deleteOutfit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const outfit = await prisma.outfit.findUnique({ where: { id } });
    if (!outfit) {
      res.status(404).json({ error: 'Outfit not found' });
      return;
    }
    if (outfit.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.outfit.delete({ where: { id } });
    res.json({ message: 'Outfit deleted successfully' });
  } catch (error) {
    console.error('Delete outfit error:', error);
    res.status(500).json({ error: 'Failed to delete outfit' });
  }
}
