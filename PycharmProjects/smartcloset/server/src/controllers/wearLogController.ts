import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types/auth';

export const createWearLogSchema = z.object({
  outfitId: z.string().uuid().optional(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  weatherTemp: z.number().optional(),
  weatherCondition: z.string().optional(),
  notes: z.string().optional(),
});

export async function createWearLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const body = req.body as z.infer<typeof createWearLogSchema>;

    // Verify outfit belongs to user if provided
    if (body.outfitId) {
      const outfit = await prisma.outfit.findUnique({ where: { id: body.outfitId } });
      if (!outfit || outfit.userId !== userId) {
        res.status(400).json({ error: 'Outfit not found' });
        return;
      }
    }

    const wearLog = await prisma.wearLog.create({
      data: {
        userId,
        outfitId: body.outfitId,
        date: new Date(body.date),
        weatherTemp: body.weatherTemp,
        weatherCondition: body.weatherCondition,
        notes: body.notes,
      },
      include: {
        outfit: { include: { items: true } },
      },
    });

    // Update timesWorn and lastWornAt for outfit items
    if (wearLog.outfit) {
      const now = new Date(body.date);
      await Promise.all(
        wearLog.outfit.items.map((item) =>
          prisma.clothingItem.update({
            where: { id: item.id },
            data: {
              timesWorn: { increment: 1 },
              lastWornAt: now,
            },
          }),
        ),
      );
    }

    res.status(201).json(wearLog);
  } catch (error) {
    console.error('Create wear log error:', error);
    res.status(500).json({ error: 'Failed to create wear log' });
  }
}

export async function getWearLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const limit = (req.query.limit as string) || '20';
    const offset = (req.query.offset as string) || '0';

    const wearLogs = await prisma.wearLog.findMany({
      where: { userId },
      include: {
        outfit: { include: { items: true } },
      },
      orderBy: { date: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.wearLog.count({ where: { userId } });

    res.json({ wearLogs, total });
  } catch (error) {
    console.error('Get wear logs error:', error);
    res.status(500).json({ error: 'Failed to get wear logs' });
  }
}

export async function deleteWearLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const wearLog = await prisma.wearLog.findUnique({ where: { id } });
    if (!wearLog) {
      res.status(404).json({ error: 'Wear log not found' });
      return;
    }
    if (wearLog.userId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.wearLog.delete({ where: { id } });
    res.json({ message: 'Wear log deleted successfully' });
  } catch (error) {
    console.error('Delete wear log error:', error);
    res.status(500).json({ error: 'Failed to delete wear log' });
  }
}
