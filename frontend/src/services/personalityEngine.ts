import type { PersonalityInputsResponse } from '@music-livereview/shared';
import { PERSONALITIES } from './personalities';

export interface DimensionScores {
  timeOfDay: 'night_owl' | 'early_bird' | 'daytime' | 'evening';
  loyalty: 'loyalist' | 'balanced' | 'explorer';
  skipBehavior: 'restless' | 'selective' | 'committed';
  sessionStyle: 'binger' | 'regular' | 'dipper';
  shuffleStyle: 'goes_with_flow' | 'intentional';
}

export interface PersonalityResult {
  id: string;
  name: string;
  emoji: string;
  description: string;
  dimensions: DimensionScores;
  funStat: string;
}

const TIME_BUCKETS: Record<DimensionScores['timeOfDay'], number[]> = {
  night_owl:   [22, 23, 0, 1, 2, 3],
  early_bird:  [5, 6, 7, 8],
  daytime:     [9, 10, 11, 12, 13, 14, 15, 16],
  evening:     [17, 18, 19, 20, 21],
};

function calcTimeOfDay(hourTotals: number[]): DimensionScores['timeOfDay'] {
  const scores = (Object.entries(TIME_BUCKETS) as Array<[DimensionScores['timeOfDay'], number[]]>)
    .map(([label, hours]) => ({
      label,
      total: hours.reduce((s, h) => s + (hourTotals[h] ?? 0), 0),
    }));
  return scores.sort((a, b) => b.total - a.total)[0].label;
}

export function scoreDimensions(inputs: PersonalityInputsResponse): DimensionScores {
  const timeOfDay = calcTimeOfDay(inputs.hourTotals);

  const loyalty: DimensionScores['loyalty'] =
    inputs.top10ArtistMsPct >= 70 ? 'loyalist' :
    inputs.top10ArtistMsPct >= 40 ? 'balanced' : 'explorer';

  const skipBehavior: DimensionScores['skipBehavior'] =
    inputs.globalSkipRate >= 50 ? 'restless' :
    inputs.globalSkipRate >= 20 ? 'selective' : 'committed';

  // avg song ~4 min → 30 songs ≈ 2h, 7.5 songs ≈ 30min
  const sessionStyle: DimensionScores['sessionStyle'] =
    inputs.avgChainLength >= 30 ? 'binger' :
    inputs.avgChainLength >= 7.5 ? 'regular' : 'dipper';

  const shuffleStyle: DimensionScores['shuffleStyle'] =
    inputs.shuffleRate >= 50 ? 'goes_with_flow' : 'intentional';

  return { timeOfDay, loyalty, skipBehavior, sessionStyle, shuffleStyle };
}

interface PersonalityMatcher {
  id: string;
  required: Partial<DimensionScores>;
  bonus?: (inputs: PersonalityInputsResponse) => boolean;
}

const MATCHERS: PersonalityMatcher[] = [
  {
    id: 'main_character',
    required: { timeOfDay: 'night_owl', loyalty: 'explorer', skipBehavior: 'restless' },
  },
  {
    id: 'npc',
    required: { timeOfDay: 'daytime', loyalty: 'loyalist', shuffleStyle: 'goes_with_flow', skipBehavior: 'committed' },
  },
  {
    id: 'served',
    required: { loyalty: 'explorer', sessionStyle: 'binger', skipBehavior: 'committed' },
  },
  {
    id: 'creature_of_habit',
    required: { timeOfDay: 'early_bird', loyalty: 'loyalist', skipBehavior: 'committed' },
  },
  {
    id: 'chronically_online',
    required: { timeOfDay: 'night_owl', loyalty: 'loyalist', sessionStyle: 'binger' },
  },
  {
    id: 'understated_intellectual',
    required: { timeOfDay: 'daytime', loyalty: 'explorer', shuffleStyle: 'intentional', skipBehavior: 'committed' },
  },
  {
    id: 'wind_down_ritualist',
    required: { timeOfDay: 'evening', loyalty: 'loyalist', sessionStyle: 'binger' },
  },
  {
    id: 'casual',
    required: { sessionStyle: 'dipper', skipBehavior: 'selective' },
  },
  {
    id: 'festival_goer',
    required: { loyalty: 'explorer', skipBehavior: 'restless' },
    bonus: (inputs) => inputs.uniqueArtistCount > 150,
  },
];

function generateFunStat(dimensions: DimensionScores, inputs: PersonalityInputsResponse): string {
  const nightMs = TIME_BUCKETS.night_owl.reduce((s, h) => s + (inputs.hourTotals[h] ?? 0), 0);
  const totalMs = inputs.hourTotals.reduce((s, v) => s + v, 0);
  const nightPct = totalMs > 0 ? Math.round(nightMs / totalMs * 100) : 0;

  if (dimensions.timeOfDay === 'night_owl') {
    return `${nightPct}% of your listening happens after 10pm.`;
  }
  if (dimensions.loyalty === 'explorer') {
    return `You've explored ${inputs.uniqueArtistCount.toLocaleString()} unique artists.`;
  }
  if (dimensions.sessionStyle === 'binger') {
    return `Your average listening run is ${Math.round(inputs.avgChainLength)} songs straight.`;
  }
  if (dimensions.skipBehavior === 'committed') {
    return `You skip less than ${Math.ceil(inputs.globalSkipRate)}% of songs you start. Rare.`;
  }
  if (dimensions.shuffleStyle === 'intentional') {
    return `Only ${Math.round(inputs.shuffleRate)}% of your listening is on shuffle. You came prepared.`;
  }
  return `You've listened to ${inputs.uniqueArtistCount.toLocaleString()} unique artists.`;
}

export function calculatePersonality(inputs: PersonalityInputsResponse): PersonalityResult {
  const dimensions = scoreDimensions(inputs);

  const scored = MATCHERS.map(matcher => {
    const entries = Object.entries(matcher.required) as Array<[keyof DimensionScores, string]>;
    const matchCount = entries.filter(([dim, val]) => dimensions[dim] === val).length;
    const baseScore = matchCount / entries.length;
    const bonusScore = matcher.bonus?.(inputs) ? 0.2 : 0;
    return { id: matcher.id, score: baseScore + bonusScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const def = PERSONALITIES[best.id];

  return {
    id: best.id,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
    dimensions,
    funStat: generateFunStat(dimensions, inputs),
  };
}

export const DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
  timeOfDay: 'Time of Day',
  loyalty: 'Loyalty',
  skipBehavior: 'Skip Behavior',
  sessionStyle: 'Session Style',
  shuffleStyle: 'Shuffle',
};

export const DIMENSION_VALUE_LABELS: { [K in keyof DimensionScores]: Record<DimensionScores[K], string> } = {
  timeOfDay: { night_owl: 'Night Owl', early_bird: 'Early Bird', daytime: 'Daytime', evening: 'Evening' },
  loyalty: { loyalist: 'Loyalist', balanced: 'Balanced', explorer: 'Explorer' },
  skipBehavior: { restless: 'Restless', selective: 'Selective', committed: 'Committed' },
  sessionStyle: { binger: 'Binger', regular: 'Regular', dipper: 'Dipper' },
  shuffleStyle: { goes_with_flow: 'Goes with the Flow', intentional: 'Intentional' },
};

export const DIMENSION_VALUE_TOOLTIPS: { [K in keyof DimensionScores]: Record<DimensionScores[K], string> } = {
  timeOfDay: {
    night_owl:  'Majority of your listening falls between 10pm–4am.',
    early_bird: 'Majority of your listening falls between 5am–9am.',
    daytime:    'Majority of your listening falls between 9am–5pm.',
    evening:    'Majority of your listening falls between 5pm–10pm.',
  },
  loyalty: {
    loyalist: 'Your top 10 artists account for 70%+ of your total listening time.',
    balanced: 'Your top 10 artists account for 40–70% of your total listening time.',
    explorer: 'Your top 10 artists account for less than 40% of your total listening time — you range wide.',
  },
  skipBehavior: {
    restless:  'You skip 50%+ of tracks you start. The next song is always the right song.',
    selective: 'You skip 20–50% of tracks. Discerning, not chaotic.',
    committed: 'You skip less than 20% of tracks. You let songs play out.',
  },
  sessionStyle: {
    binger:  'Your average listening session runs over 2 hours straight.',
    regular: 'Your average session is 30 minutes to 2 hours — a solid sit-down.',
    dipper:  'Your average session is under 30 minutes. In, out, on with your day.',
  },
  shuffleStyle: {
    goes_with_flow: '70%+ of your listening is on shuffle. You trust the algorithm (or chaos).',
    intentional:    'Less than 30% of your listening is on shuffle. You came with a plan.',
  },
};
