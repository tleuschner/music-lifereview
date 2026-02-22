export interface PersonalityDefinition {
  name: string;
  emoji: string;
  description: string;
}

export const PERSONALITIES: Record<string, PersonalityDefinition> = {
  main_character: {
    name: 'The Main Character',
    emoji: '👑',
    description: "You don't follow playlists, playlists follow you. Always onto the next thing before anyone else has even heard it. Your skip button has more miles on it than most people's entire libraries.",
  },
  npc: {
    name: 'The NPC',
    emoji: '🎧',
    description: "You found your 5 artists in 2019 and honestly? Life is good. Shuffle on, no complaints, no skips. You're not a prisoner of the algorithm — you're at peace with it.",
  },
  served: {
    name: 'Served',
    emoji: '🍽️',
    description: "You consume music like it's a 12-course tasting menu and you're never full. New artist? Ate. Deep cut B-side? Ate. Three-hour session on a Tuesday? Said yes and stayed for dessert.",
  },
  creature_of_habit: {
    name: 'The Creature of Habit',
    emoji: '☀️',
    description: "Same artists, same morning routine, same energy. Comforting to some, iconic to you.",
  },
  chronically_online: {
    name: 'The Chronically Online',
    emoji: '🌙',
    description: "It's 3am, you're on your 4th relisten of the same album, and you feel absolutely nothing is wrong with this.",
  },
  understated_intellectual: {
    name: 'The Understated Intellectual',
    emoji: '🎼',
    description: "No shuffle. Deliberate playlists. You've heard of artists people won't discover for two years. You don't tell people this unprompted — but you could.",
  },
  wind_down_ritualist: {
    name: 'The Wind-Down Ritualist',
    emoji: '🌙',
    description: "Music as a decompression chamber. Same vibes, long sessions, earned.",
  },
  casual: {
    name: 'The Casual Girlypop',
    emoji: '✨',
    description: "Short sessions, curated skips, never overcommits. You're having fun but you're not obsessed. Healthy relationship with music. Rare.",
  },
  festival_goer: {
    name: 'The Festival Goer',
    emoji: '🎪',
    description: "You have listened to 847 unique artists this year and can name maybe 12 of them. No notes.",
  },
};
