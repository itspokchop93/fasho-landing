// Shared music genres across the application
// This ensures consistency between checkout page and admin playlist management

export const MUSIC_GENRES = [
  'Rock',
  'Pop', 
  'Hip-Hop/Rap',
  'Electronic/Dance (EDM)',
  'Jazz',
  'Blues',
  'Country',
  'Folk',
  'Classical',
  'Reggae',
  'R&B/Soul',
  'Metal',
  'Latin',
  'World',
  'Gospel/Religious',
  'Podcast'
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number];

// Helper function to generate genre options for select elements
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
