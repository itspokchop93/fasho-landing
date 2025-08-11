// Browser Console Script to Add Multiple Playlists
// Run this in your browser console while logged into the admin panel

const playlists = [
  {
    playlistName: "Rock Rebels",
    genre: "Rock",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/6jeAQUKnVEw5XdOHaH6BVz?si=L9P0RVQjScWpLS9cogGwQQ",
    maxSongs: 25
  },
  {
    playlistName: "Electro Empire",
    genre: "Electronic/Dance (EDM)",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/3Gq22svR5AnpUZsBItUHSR?si=KgbibeG-TT-q7elCPyR6IQ",
    maxSongs: 25
  },
  {
    playlistName: "Country Roads",
    genre: "Country",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/7eCnASejdTyeIr4MrZD67R?si=BmZuEj_BT8eEE0RyHVALUQ",
    maxSongs: 25
  },
  {
    playlistName: "Tropical Heat",
    genre: "Latin",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/46umK8G7wo85fstKYtbyWA?si=zEUJQllCREGWFEflYMW9JA",
    maxSongs: 25
  },
  {
    playlistName: "Indie Revolution",
    genre: "Rock",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/4GzdJN3kBAjDPEcUOF3iQ9?si=Kp_TycFpRL-QhonVdYWTEw",
    maxSongs: 25
  },
  {
    playlistName: "Gospel Glory",
    genre: "Gospel/Religious",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/5ol3BnpcpSjBv1RbyqwMzf?si=NwDOcWlBQu6vEYHd6kLhfA",
    maxSongs: 25
  },
  {
    playlistName: "Global Hits Factory",
    genre: "General",
    accountEmail: "tophits4@ajjak.com",
    playlistLink: "https://open.spotify.com/playlist/6IyGiH3atPBrzEb2VFKPQu?si=IJGatQa_TtSp4-eON-UJug",
    maxSongs: 25
  }
];

async function addAllPlaylists() {
  console.log("🎵 Starting to add playlists...");
  
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    console.log(`🎵 Adding playlist ${i + 1}/7: ${playlist.playlistName}`);
    
    try {
      const response = await fetch('/api/marketing-manager/system-settings/add-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This ensures cookies are sent
        body: JSON.stringify(playlist)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Successfully added: ${playlist.playlistName}`);
        console.log(`   - Genre: ${playlist.genre}`);
        console.log(`   - Initial song count from Spotify API: ${result.playlist?.cached_song_count || 'fetching...'}`);
      } else {
        console.error(`❌ Failed to add ${playlist.playlistName}:`, result.error);
      }
      
      // Add a small delay between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error adding ${playlist.playlistName}:`, error);
    }
  }
  
  console.log("🎉 Finished adding all playlists! Check the System Settings page to see them.");
}

// Run the function
addAllPlaylists();
