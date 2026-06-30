// Contributor badges & tiers. Pure logic — fed by UserStats (see lib/stats.ts).

export interface UserStats {
  reviewCount: number;
  photoCount: number;
  helpfulReceived: number;
  followers: number;
  gymFives: number;
  barFives: number;
  cities: number;
}

export const EMPTY_STATS: UserStats = {
  reviewCount: 0,
  photoCount: 0,
  helpfulReceived: 0,
  followers: 0,
  gymFives: 0,
  barFives: 0,
  cities: 0,
};

// ---- Tier: a single rank from total reviews -------------------------------

export interface Tier {
  key: string;
  label: string;
  emoji: string;
  color: string;
  min: number; // minimum reviews
}

// Ordered low → high. The user's tier is the highest whose `min` they meet.
export const TIERS: Tier[] = [
  { key: "newcomer", label: "Newcomer", emoji: "🌱", color: "#9AA4B2", min: 0 },
  { key: "bronze", label: "Bronze", emoji: "🥉", color: "#CD7F32", min: 1 },
  { key: "silver", label: "Silver", emoji: "🥈", color: "#9FB1C4", min: 5 },
  { key: "gold", label: "Gold", emoji: "🥇", color: "#E0A92E", min: 15 },
  { key: "platinum", label: "Platinum", emoji: "💎", color: "#48B7C7", min: 30 },
  { key: "road_warrior", label: "Road Warrior", emoji: "🧳", color: "#1488DB", min: 50 },
];

export function computeTier(stats: UserStats): { current: Tier; next: Tier | null; toNext: number } {
  let current = TIERS[0];
  for (const t of TIERS) if (stats.reviewCount >= t.min) current = t;
  const idx = TIERS.indexOf(current);
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  const toNext = next ? Math.max(0, next.min - stats.reviewCount) : 0;
  return { current, next, toNext };
}

// ---- Badges: achievements with progress -----------------------------------

export interface BadgeDef {
  key: string;
  label: string;
  emoji: string;
  description: string;
  target: number;
  value: (s: UserStats) => number;
}

export const BADGES: BadgeDef[] = [
  { key: "first_rep", label: "First Rep", emoji: "✅", description: "Post your first review", target: 1, value: (s) => s.reviewCount },
  { key: "prolific", label: "Road Warrior", emoji: "🧳", description: "Write 25 reviews", target: 25, value: (s) => s.reviewCount },
  { key: "shutterbug", label: "Shutterbug", emoji: "📸", description: "Add 10 photos", target: 10, value: (s) => s.photoCount },
  { key: "tastemaker", label: "Tastemaker", emoji: "💡", description: "Earn 25 helpful votes", target: 25, value: (s) => s.helpfulReceived },
  { key: "gym_rat", label: "Gym Rat", emoji: "🏋️", description: "Give 10 perfect gym scores", target: 10, value: (s) => s.gymFives },
  { key: "mixologist", label: "Mixologist", emoji: "🍸", description: "Give 10 perfect bar scores", target: 10, value: (s) => s.barFives },
  { key: "globetrotter", label: "Globetrotter", emoji: "🌍", description: "Review hotels in 5 cities", target: 5, value: (s) => s.cities },
  { key: "influencer", label: "Influencer", emoji: "⭐", description: "Reach 25 followers", target: 25, value: (s) => s.followers },
];

export interface BadgeProgress {
  key: string;
  label: string;
  emoji: string;
  description: string;
  value: number;
  target: number;
  earned: boolean;
  progress: number; // 0..1
}

export function computeBadges(stats: UserStats): BadgeProgress[] {
  return BADGES.map((b) => {
    const value = b.value(stats);
    return {
      key: b.key,
      label: b.label,
      emoji: b.emoji,
      description: b.description,
      value,
      target: b.target,
      earned: value >= b.target,
      progress: Math.min(1, value / b.target),
    };
  });
}

export function earnedCount(stats: UserStats): number {
  return computeBadges(stats).filter((b) => b.earned).length;
}
