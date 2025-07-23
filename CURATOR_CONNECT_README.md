# Curator Connect+ Feature

## Overview
Curator Connect+ is a comprehensive dashboard feature that allows users to browse, filter, and contact Spotify playlist curators. The feature fetches live data from a Google Sheets database and provides an Excel-like interface for managing curator interactions.

## Features Implemented

### 1. Data Source Integration
- **Google Sheets API**: Fetches curator data from live Google Sheets
- **Service Account**: Uses secure service account authentication
- **Real-time Updates**: Data updates automatically when Google Sheet changes

### 2. User Interface
- **Excel-style Table**: Clean, modern table interface matching dashboard theme
- **Responsive Design**: Works on desktop and mobile devices
- **Playlist Images**: Displays playlist cover art with fallback
- **Clickable Links**: Direct links to Spotify playlists
- **View Playlist Button**: Clear button to open playlist in new tab
- **Individual Genre Bubbles**: Each genre displayed as separate clickable grey bubbles

### 3. Advanced Filtering & Sorting
- **Search**: Search by playlist name
- **Multi-Genre Filter**: Multi-select dropdown to filter by multiple genres
- **Genre Bubble Click**: Click any genre bubble to filter by that specific genre
- **Follower Range**: Filter by minimum/maximum follower count
- **Status Filter**: Show contacted/not contacted curators
- **Sorting**: Sort by followers (asc/desc) or playlist name

### 4. Contact Management
- **Mailto Integration**: Opens user's email client with pre-filled subject
- **Contact Tracking**: Tracks which curators each user has contacted
- **Visual Indicators**: Shows contact status with checkmarks
- **Privacy Protection**: Never displays email addresses directly on page

### 5. Database Integration
- **Contact Tracking**: Stores user-curator interactions in Supabase
- **Row Level Security**: Users can only see their own contact history
- **Persistent Storage**: Contact status persists across sessions

## Technical Implementation

### API Endpoints
1. **`/api/curator-connect`**: Fetches curator data from Google Sheets
2. **`/api/curator-contact-track`**: Tracks when users contact curators
3. **`/api/curator-contacts`**: Retrieves user's contact history

### Database Schema
```sql
CREATE TABLE curator_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  curator_id INTEGER NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  contact_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, curator_id)
);
```

### Google Sheets Structure
The feature expects the following columns in the Google Sheet:
- Column A: Playlist Image URL
- Column B: Playlist Name
- Column C: Playlist URL
- Column D: Genre
- Column E: Playlist Saves (followers)
- Column F: Contact Email

## Setup Instructions

### 1. Database Setup
Run the SQL script `create_curator_contacts_table.sql` in your Supabase SQL editor to create the required table.

### 2. Google Sheets Configuration
- Ensure the Google Sheet is shared with the service account email
- Verify the sheet has the correct column structure
- Update the spreadsheet ID in `/api/curator-connect.ts` if needed

### 3. Service Account
The feature uses the existing `googleserviceaccount.json` file for authentication.

## Usage

### For Users
1. Navigate to the "Curator Connect+" tab in the dashboard
2. Use filters to find relevant playlists
3. Click "Contact" to reach out to curators
4. Track your contact history with visual indicators

### For Administrators
- Monitor contact patterns through the database
- Update curator data by editing the Google Sheet
- All changes are reflected in real-time

## Security Features
- **Email Privacy**: Curator emails are never displayed on the page
- **Rate Limiting**: Built-in protection against spam
- **User Isolation**: Users can only see their own contact history
- **Secure API**: All endpoints use proper authentication

## Performance Optimizations
- **Lazy Loading**: Data only loads when tab is active
- **Efficient Filtering**: Client-side filtering for fast response
- **Image Fallbacks**: Graceful handling of missing playlist images
- **Responsive Design**: Optimized for all screen sizes

## Recent Updates

### Genre System Improvements
- **Individual Genre Bubbles**: Genres like "Pop, Party, Top Hits" are now split into separate clickable bubbles
- **Multi-Select Genre Filter**: Custom dropdown allows selecting multiple genres simultaneously
- **Genre Bubble Filtering**: Click any genre bubble to instantly filter the list by that genre
- **Enhanced UI**: Replaced "Click to view playlist" text with a proper "View Playlist" button

## Future Enhancements
- Bulk contact functionality
- Email templates
- Contact analytics dashboard
- Integration with email marketing tools
- Advanced search filters 