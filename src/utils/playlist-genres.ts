import { MUSIC_GENRES } from '../constants/genres';

export const PLAYLIST_GENRE_OPTIONS = Array.from(
  new Set(['General', ...MUSIC_GENRES])
);

export function parsePlaylistGenres(value: string | string[] | null | undefined): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const seen = new Set<string>();
  const genres: string[] = [];

  for (const rawValue of rawValues) {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      continue;
    }

    const normalizedValue = trimmedValue.toLowerCase();
    if (seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    genres.push(trimmedValue);
  }

  return genres;
}

export function formatPlaylistGenres(value: string | string[] | null | undefined): string {
  return parsePlaylistGenres(value).join(', ');
}

export function playlistHasGenre(
  playlistGenres: string | string[] | null | undefined,
  genre: string
): boolean {
  const normalizedTargetGenre = genre.trim().toLowerCase();
  if (!normalizedTargetGenre) {
    return false;
  }

  return parsePlaylistGenres(playlistGenres).some(
    (playlistGenre) => playlistGenre.toLowerCase() === normalizedTargetGenre
  );
}

export function playlistMatchesRequestedGenres(
  playlistGenres: string | string[] | null | undefined,
  requestedGenres: string | string[] | null | undefined
): boolean {
  const playlistGenreSet = new Set(
    parsePlaylistGenres(playlistGenres).map((genre) => genre.toLowerCase())
  );
  const normalizedRequestedGenres = parsePlaylistGenres(requestedGenres).map((genre) =>
    genre.toLowerCase()
  );

  if (playlistGenreSet.size === 0 || normalizedRequestedGenres.length === 0) {
    return false;
  }

  return normalizedRequestedGenres.some((genre) => playlistGenreSet.has(genre));
}
