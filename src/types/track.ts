export interface Track {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  url: string;
  artistProfileUrl?: string; // Spotify artist profile URL
  artistInsights?: {
    name: string;
    imageUrl: string;
    followersCount: number;
    genres: string[];
    popularity: number;
  };
} 