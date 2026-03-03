// Grouped genre/vibe/sound categories for the Vibe selection step
// and admin playlist management

export interface GenreGroup {
  label: string;
  items: string[];
}

export const GENRE_GROUPS: GenreGroup[] = [
  {
    label: 'Genres',
    items: [
      'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Indie', 'Electronic', 'Latin',
      'Afrobeats', 'Reggae', 'Country', 'Gospel', 'Jazz', 'Folk',
      'Lo-Fi', 'Podcast',
    ],
  },
  {
    label: 'Vibes',
    items: [
      'Party', 'Chill', 'Sad', 'Dark', 'Hype', 'Love', 'Motivation',
      'Late Night', 'Angry', 'Anthem', 'Feel Good', 'Happy',
      'Heartbreak', 'Experimental', 'Gym', 'Road Trip', 'Study',
      'Sleep', 'Meditation', 'Summer',
    ],
  },
  {
    label: 'Sounds',
    items: [
      'Guitar', 'Piano', 'Acoustic', 'Melodic',
      'Orchestral', 'Synth',
    ],
  },
];

// Flat list of all options (used by admin dropdowns and anywhere a simple array is needed)
export const MUSIC_GENRES = GENRE_GROUPS.flatMap(g => g.items) as readonly string[];

// Migration map: old genre values → new equivalents
// Old genres that still exist (exact or renamed) are mapped here.
// Old genres with no direct match are dropped silently.
const LEGACY_GENRE_MAP: Record<string, string> = {
  'Hip-Hop/Rap': 'Hip-Hop',
  'R&B/Soul': 'R&B',
  'Electronic/Dance (EDM)': 'Electronic',
  'Gospel/Religious': 'Gospel',
  'General': 'Pop',
  'Blues': 'Sad',
  'Classical': 'Orchestral',
  'Metal': 'Rock',
  'World': 'Afrobeats',
};

const VALID_GENRES_SET = new Set<string>(MUSIC_GENRES);

/**
 * Migrates a list of genre strings from legacy values to current valid genres.
 * - Known current genres pass through unchanged
 * - Old renamed genres are mapped to their new equivalents
 * - Unrecognized genres are dropped
 * - Duplicates are removed
 */
export function migrateGenres(genres: string[]): string[] {
  const result = new Set<string>();
  for (const g of genres) {
    const trimmed = g.trim();
    if (!trimmed) continue;
    if (VALID_GENRES_SET.has(trimmed)) {
      result.add(trimmed);
    } else if (LEGACY_GENRE_MAP[trimmed]) {
      result.add(LEGACY_GENRE_MAP[trimmed]);
    }
    // unrecognized genres are silently dropped
  }
  return Array.from(result);
}

export type MusicGenre = typeof MUSIC_GENRES[number];

export const generateGenreOptions = (includeEmptyOption = true) => {
  const options = MUSIC_GENRES.map(genre => ({
    value: genre,
    label: genre
  }));

  if (includeEmptyOption) {
    return [{ value: '', label: 'Select a genre...' }, ...options];
  }

  return options;
};
