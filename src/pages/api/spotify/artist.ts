import { NextApiRequest, NextApiResponse } from 'next';
import { getArtistById, getSpotifyAccessToken, getArtistAlbums, getAlbumTracks } from '../../../utils/spotify-api';

function extractArtistId(url: string): string | null {
  const match = url.match(/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { artistId, artistUrl, includeAlbums = 'true' } = req.query;
    
    let spotifyArtistId: string;
    if (artistId && typeof artistId === 'string') {
      spotifyArtistId = artistId;
    } else if (artistUrl && typeof artistUrl === 'string') {
      const extractedId = extractArtistId(artistUrl);
      if (!extractedId) {
        return res.status(400).json({ error: 'Invalid Spotify artist URL' });
      }
      spotifyArtistId = extractedId;
    } else {
      return res.status(400).json({ error: 'Artist ID or URL is required' });
    }

    console.log('🎵 SPOTIFY-ARTIST: Fetching artist data for:', spotifyArtistId);

    const artistData = await getArtistById(spotifyArtistId);
    
    if (!artistData) {
      console.error('🎵 SPOTIFY-ARTIST: Artist not found');
      return res.status(404).json({ error: 'Artist not found' });
    }

    console.log('🎵 SPOTIFY-ARTIST: Found artist:', artistData.name);

    let albums: any[] = [];
    if (includeAlbums === 'true') {
      console.log('🎵 SPOTIFY-ARTIST: Fetching albums for artist');
      
      const rawAlbums = await getArtistAlbums(spotifyArtistId, 50);

      const albumsWithTracks = await Promise.all(
        rawAlbums.slice(0, 10).map(async (album: any) => {
          try {
            const rawTracks = await getAlbumTracks(album.id);
            const tracks = rawTracks.map((track: any) => ({
              id: track.id,
              name: track.name,
              duration_ms: track.duration_ms,
              trackNumber: track.track_number,
              previewUrl: track.preview_url,
              spotifyUrl: track.external_urls?.spotify,
            }));

            return {
              id: album.id,
              name: album.name,
              imageUrl: album.images?.[0]?.url || null,
              releaseDate: album.release_date,
              albumType: album.album_type,
              totalTracks: album.total_tracks,
              spotifyUrl: album.external_urls?.spotify,
              tracks: tracks,
            };
          } catch (error) {
            console.error('🎵 SPOTIFY-ARTIST: Error fetching tracks for album:', album.id, error);
            return null;
          }
        })
      );

      albums = albumsWithTracks.filter(album => album !== null);
      console.log(`🎵 SPOTIFY-ARTIST: Found ${albums.length} albums with tracks`);
    }

    const response = {
      artist: {
        ...artistData,
        popularity: 0,
      },
      albums: albums,
      topTracks: [],
    };

    console.log('🎵 SPOTIFY-ARTIST: Returning complete artist data');
    res.status(200).json(response);

  } catch (error) {
    console.error('🎵 SPOTIFY-ARTIST: Error:', error);
    res.status(500).json({ error: 'Failed to fetch artist data' });
  }
}
