import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';

const genders = ['MALE', 'FEMALE', 'UNSPECIFIED'] as const;
const preferredStyles = ['CASUAL', 'FORMAL', 'SPORTY', 'CLASSIC', 'STREETWEAR', 'MINIMALIST'] as const;
const hairStyles = ['SHORT', 'MEDIUM', 'LONG', 'CURLY', 'BRAIDS', 'BUN', 'PONYTAIL', 'BUZZ'] as const;
const hairColors = ['BLACK', 'BROWN', 'BLONDE', 'RED', 'AUBURN', 'GRAY', 'WHITE'] as const;
const bodyShapes = ['RECTANGLE', 'TRIANGLE', 'INVERTED_TRIANGLE', 'HOURGLASS', 'OVAL'] as const;

export const updateUserSchema = z.object({
  fullName: z.string().min(1, 'Name is required').optional(),
  gender: z.enum(genders).optional(),
});

export const upsertProfileSchema = z.object({
  heightCm: z.number().positive('Height must be positive'),
  weightKg: z.number().positive('Weight must be positive'),
  chestCm: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  hipsCm: z.number().positive().optional(),
  shouldersCm: z.number().positive().optional(),
  skinTone: z.string().optional(),
  hairStyle: z.enum(hairStyles).optional(),
  hairColor: z.enum(hairColors).optional(),
  bodyShape: z.enum(bodyShapes).optional(),
  preferredStyle: z.enum(preferredStyles).optional(),
});

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        gender: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

export async function upsertProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const body = req.body as z.infer<typeof upsertProfileSchema>;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        chestCm: body.chestCm,
        waistCm: body.waistCm,
        hipsCm: body.hipsCm,
        shouldersCm: body.shouldersCm,
        skinTone: body.skinTone,
        hairStyle: body.hairStyle,
        hairColor: body.hairColor,
        bodyShape: body.bodyShape,
        preferredStyle: body.preferredStyle ?? 'CASUAL',
      },
      create: {
        userId,
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        chestCm: body.chestCm,
        waistCm: body.waistCm,
        hipsCm: body.hipsCm,
        shouldersCm: body.shouldersCm,
        skinTone: body.skinTone,
        hairStyle: body.hairStyle,
        hairColor: body.hairColor,
        bodyShape: body.bodyShape,
        preferredStyle: body.preferredStyle ?? 'CASUAL',
      },
    });

    res.json(profile);
  } catch (error) {
    console.error('Upsert profile error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const body = req.body as z.infer<typeof updateUserSchema>;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.fullName && { fullName: body.fullName }),
        ...(body.gender && { gender: body.gender }),
      },
      select: { id: true, email: true, fullName: true, gender: true, createdAt: true },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const [clothingCount, outfitCount, wearLogCount, favoriteCount] = await Promise.all([
      prisma.clothingItem.count({ where: { userId } }),
      prisma.outfit.count({ where: { userId } }),
      prisma.wearLog.count({ where: { userId } }),
      prisma.clothingItem.count({ where: { userId, isFavorite: true } }),
    ]);

    res.json({ clothingCount, outfitCount, wearLogCount, favoriteCount });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
}
