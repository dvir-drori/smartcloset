import prisma from '../utils/prisma';

type ClothingCategory = 'TOP' | 'BOTTOM' | 'OUTERWEAR' | 'SHOES' | 'ACCESSORY' | 'UNDERWEAR' | 'SWIMWEAR' | 'FORMAL';
type Occasion = 'CASUAL' | 'WORK' | 'FORMAL' | 'SPORT' | 'GOING_OUT';
type Season = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';

interface ClothingItemRow {
  id: string;
  name: string;
  category: ClothingCategory;
  color: string;
  secondaryColor: string | null;
  season: string;
  occasion: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  timesWorn: number;
  lastWornAt: Date | null;
}

interface ScoredCombo {
  items: ClothingItemRow[];
  score: number;
  reasons: string[];
  suggestedName: string;
}

// Neutrals match with everything
const NEUTRALS = new Set(['black', 'white', 'gray', 'grey', 'navy', 'beige', 'brown', 'cream', 'khaki', 'tan']);

// Known good color pairings
const HARMONY_PAIRS: [string, string][] = [
  ['navy', 'white'], ['navy', 'khaki'], ['black', 'red'],
  ['blue', 'white'], ['green', 'brown'], ['blue', 'brown'],
  ['pink', 'gray'], ['pink', 'grey'], ['red', 'black'],
  ['olive', 'cream'], ['burgundy', 'navy'], ['teal', 'coral'],
  ['maroon', 'gold'], ['purple', 'silver'],
];

function normalizeColor(color: string): string {
  return color.toLowerCase().trim().replace('grey', 'gray');
}

function colorCompatibility(colors: string[]): number {
  const normalized = colors.map(normalizeColor);
  if (normalized.length <= 1) return 15;

  // All neutrals = good
  if (normalized.every((c) => NEUTRALS.has(c))) return 12;

  let score = 0;
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];

      // Neutral + anything = good
      if (NEUTRALS.has(a) || NEUTRALS.has(b)) {
        score += 10;
        continue;
      }

      // Known harmony
      const isHarmony = HARMONY_PAIRS.some(
        ([x, y]) => (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x)),
      );
      if (isHarmony) {
        score += 12;
      } else {
        score += 3;
      }
    }
  }

  const pairs = (normalized.length * (normalized.length - 1)) / 2;
  return Math.min(15, Math.round((score / pairs) * (15 / 12)));
}

function parseJsonArray(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export interface RecommendationFilters {
  occasion?: Occasion;
  season?: Season;
}

export async function getRecommendations(
  userId: string,
  filters: RecommendationFilters,
): Promise<{ recommendations: ScoredCombo[]; message?: string }> {
  // Fetch all user clothing items
  const allItems = await prisma.clothingItem.findMany({
    where: { userId },
  }) as unknown as ClothingItemRow[];

  if (allItems.length < 3) {
    return {
      recommendations: [],
      message: 'Add at least 3 items (a top, bottom, and shoes) to get outfit recommendations.',
    };
  }

  // Group by category
  const grouped: Partial<Record<ClothingCategory, ClothingItemRow[]>> = {};
  for (const item of allItems) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  }

  const tops = grouped.TOP || [];
  const bottoms = grouped.BOTTOM || [];
  const shoes = grouped.SHOES || [];
  const outerwear = grouped.OUTERWEAR || [];
  const accessories = grouped.ACCESSORY || [];

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return {
      recommendations: [],
      message: 'You need at least one top, one bottom, and one pair of shoes for recommendations.',
    };
  }

  // Soft-score individual items for pre-filtering
  function itemScore(item: ClothingItemRow): number {
    let s = 0;
    const itemSeasons = parseJsonArray(item.season);
    const itemOccasions = parseJsonArray(item.occasion);

    if (filters.occasion && itemOccasions.includes(filters.occasion)) s += 30;
    if (filters.season && itemSeasons.includes(filters.season)) s += 20;

    // Wear recency bonus: items not worn recently get a boost
    if (!item.lastWornAt) {
      s += 25; // Never worn - high priority
    } else {
      const daysSince = (Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24);
      s += Math.min(25, Math.round(daysSince));
    }

    return s;
  }

  // Sort & limit per category
  const sortedTops = tops.sort((a, b) => itemScore(b) - itemScore(a)).slice(0, 6);
  const sortedBottoms = bottoms.sort((a, b) => itemScore(b) - itemScore(a)).slice(0, 6);
  const sortedShoes = shoes.sort((a, b) => itemScore(b) - itemScore(a)).slice(0, 4);
  const topOuterwear = outerwear.sort((a, b) => itemScore(b) - itemScore(a)).slice(0, 3);
  const topAccessories = accessories.sort((a, b) => itemScore(b) - itemScore(a)).slice(0, 3);

  // Get existing outfit item-id sets for deduplication
  const existingOutfits = await prisma.outfit.findMany({
    where: { userId },
    include: { items: { select: { id: true } } },
  });
  const existingSets = new Set(
    existingOutfits.map((o) => o.items.map((i) => i.id).sort().join(',')),
  );

  // Generate combos
  const combos: ScoredCombo[] = [];

  for (const top of sortedTops) {
    for (const bottom of sortedBottoms) {
      for (const shoe of sortedShoes) {
        const baseItems = [top, bottom, shoe];

        // Try with and without outerwear/accessories
        const variants: ClothingItemRow[][] = [baseItems];
        for (const ow of topOuterwear) {
          variants.push([...baseItems, ow]);
        }
        for (const acc of topAccessories) {
          variants.push([...baseItems, acc]);
        }

        for (const items of variants) {
          const ids = items.map((i) => i.id).sort().join(',');
          if (existingSets.has(ids)) continue;

          const reasons: string[] = [];
          let score = 0;

          // Occasion match (30pts)
          if (filters.occasion) {
            const matching = items.filter((i) =>
              parseJsonArray(i.occasion).includes(filters.occasion!),
            );
            const ratio = matching.length / items.length;
            const pts = Math.round(ratio * 30);
            score += pts;
            if (ratio >= 0.5) reasons.push(`Good for ${filters.occasion.toLowerCase()}`);
          }

          // Season match (20pts)
          if (filters.season) {
            const matching = items.filter((i) =>
              parseJsonArray(i.season).includes(filters.season!),
            );
            const ratio = matching.length / items.length;
            const pts = Math.round(ratio * 20);
            score += pts;
            if (ratio >= 0.5) reasons.push(`Suitable for ${filters.season.toLowerCase()}`);
          }

          // Wear recency (25pts) - prefer unworn/rarely worn
          let recencyTotal = 0;
          for (const item of items) {
            if (!item.lastWornAt) {
              recencyTotal += 25;
            } else {
              const daysSince = (Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24);
              recencyTotal += Math.min(25, Math.round(daysSince));
            }
          }
          const recencyScore = Math.round(recencyTotal / items.length);
          score += recencyScore;
          if (recencyScore >= 15) reasons.push('Fresh combination');

          // Color compatibility (15pts)
          const colors = items.map((i) => i.color);
          const colorScore = colorCompatibility(colors);
          score += colorScore;
          if (colorScore >= 10) reasons.push('Colors work well together');

          // Variety/novelty (10pts) - bonus for items with low timesWorn
          const avgWorn = items.reduce((sum, i) => sum + i.timesWorn, 0) / items.length;
          const varietyScore = Math.max(0, 10 - Math.round(avgWorn));
          score += varietyScore;
          if (varietyScore >= 5) reasons.push('Try something new');

          if (reasons.length === 0) reasons.push('Suggested combination');

          // Generate name
          const occasionLabel = filters.occasion
            ? filters.occasion.charAt(0) + filters.occasion.slice(1).toLowerCase().replace('_', ' ')
            : 'Everyday';
          const suggestedName = `${occasionLabel} Look #${combos.length + 1}`;

          combos.push({ items, score, reasons, suggestedName });
        }
      }
    }
  }

  // Sort by score descending and return top 5
  combos.sort((a, b) => b.score - a.score);
  const top5 = combos.slice(0, 5);

  // Re-number names
  top5.forEach((combo, i) => {
    const occasionLabel = filters.occasion
      ? filters.occasion.charAt(0) + filters.occasion.slice(1).toLowerCase().replace('_', ' ')
      : 'Everyday';
    combo.suggestedName = `${occasionLabel} Look #${i + 1}`;
  });

  return { recommendations: top5 };
}
