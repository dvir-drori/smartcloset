import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { getRecommendations } from '../services/recommendationService';

const occasions = ['CASUAL', 'WORK', 'FORMAL', 'SPORT', 'GOING_OUT'] as const;
const seasonValues = ['SPRING', 'SUMMER', 'FALL', 'WINTER'] as const;

export const saveRecommendationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  occasion: z.enum(occasions),
  season: z.array(z.enum(seasonValues)).optional(),
  itemIds: z.array(z.string().uuid()).min(1, 'At least one clothing item is required'),
});

export async function getOutfitRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const occasion = req.query.occasion as string | undefined;
    const season = req.query.season as string | undefined;

    const filters: { occasion?: typeof occasions[number]; season?: typeof seasonValues[number] } = {};
    if (occasion && occasions.includes(occasion as typeof occasions[number])) {
      filters.occasion = occasion as typeof occasions[number];
    }
    if (season && seasonValues.includes(season as typeof seasonValues[number])) {
      filters.season = season as typeof seasonValues[number];
    }

    const result = await getRecommendations(userId, filters);
    res.json(result);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
}

function parseItemJson(item: { season: string; occasion: string; [key: string]: unknown }) {
  return { ...item, season: JSON.parse(item.season), occasion: JSON.parse(item.occasion) };
}

export async function saveRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const body = req.body as z.infer<typeof saveRecommendationSchema>;

    // Verify items belong to user
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
        isAISuggested: true,
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
    console.error('Save recommendation error:', error);
    res.status(500).json({ error: 'Failed to save recommendation' });
  }
}
