/**
 * Raw Spotify Extended Streaming History entry as it appears in the JSON export.
 */
export interface SpotifyStreamEntry {
  ts: string;
  username: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr_decrypted: string | null;
  user_agent_decrypted: string | null;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
  episode_name: string | null;
  episode_show_name: string | null;
  spotify_episode_uri: string | null;
  reason_start: string | null;
  reason_end: string | null;
  shuffle: boolean | null;
  skipped: boolean | null;
  offline: boolean | null;
  offline_timestamp: number | null;
  incognito_mode: boolean | null;
}

/**
 * Fields that are stripped during ingestion for privacy.
 */
export const PII_FIELDS: (keyof SpotifyStreamEntry)[] = [
  'username',
  'ip_addr_decrypted',
  'user_agent_decrypted',
  'offline_timestamp',
  'incognito_mode',
];

/**
 * Required fields that must be present for a valid audio stream entry.
 */
export const REQUIRED_AUDIO_FIELDS: (keyof SpotifyStreamEntry)[] = [
  'ts',
  'ms_played',
];
