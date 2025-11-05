# Active Users Tracking System

> **Status Update (2025-11-04):** The Active Users tracking system has been fully deactivated. The admin dashboard no longer renders this feature, the tracking middleware and hooks have been removed, and all related API routes are offline. Retain this document for historical reference only.

## Overview

The Active Users tracking system provides real-time monitoring of users currently on the website, including their IP addresses, current pages, browser information, and activity status. This system is designed for the admin dashboard to provide live analytics.

## Architecture

### Components

1. **Database Tables**
   - `active_users` - Tracks currently active users
   - `daily_visits` - Tracks daily visit statistics

2. **API Endpoints**
   - `/api/track-activity` - Frontend tracking endpoint
   - `/api/admin/active-users` - Admin endpoint to fetch active users
   - `/api/admin/daily-stats` - Admin endpoint to fetch daily statistics

3. **Frontend Components**
   - `ActiveUsersSection` - Admin dashboard component
   - `useActivityTracking` - React hook for tracking user activity

4. **Middleware**
   - Automatic tracking on page loads
   - Session management

## How It Works

### 1. User Activity Tracking

**Automatic Tracking (Middleware)**
- Every page load is automatically tracked via middleware
- Session IDs are created and maintained via cookies
- User information is extracted from Supabase auth

**Manual Tracking (Frontend Hook)**
- `useActivityTracking` hook tracks user interactions
- Tracks mouse movements, clicks, keyboard input, scrolling
- Tracks page visibility changes and window focus
- Periodic tracking every 30 seconds
- Page change tracking

### 2. Data Flow

```
User visits page → Middleware tracks → Database updated
User interacts → Hook tracks → API called → Database updated
Admin views dashboard → API fetches → Real-time display
```

### 3. Real-time Updates

- Admin dashboard polls every 10 seconds for active users
- Daily stats are updated every 60 seconds
- Connection status is monitored and displayed
- Automatic retry on connection failures

## Database Schema

### active_users Table
```sql
CREATE TABLE active_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  current_page VARCHAR(500) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  is_guest BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### daily_visits Table
```sql
CREATE TABLE daily_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  ip_address INET NOT NULL,
  total_visits INTEGER DEFAULT 1,
  is_unique BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Database Functions

### cleanup_inactive_users()
- Removes users inactive for more than 5 minutes
- Called automatically by the system

### get_daily_visit_stats(target_date)
- Returns total visits and unique visitors for a given date
- Used by the admin dashboard

### upsert_daily_visit(visit_date, visitor_ip)
- Updates or inserts daily visit records
- Tracks both total visits and unique visitors

## API Endpoints

### POST /api/track-activity
**Purpose**: Track user activity from frontend
**Body**:
```json
{
  "currentPage": "/dashboard",
  "userAgent": "Mozilla/5.0..."
}
```
**Response**:
```json
{
  "success": true,
  "sessionId": "uuid",
  "tracked": true
}
```

### GET /api/admin/active-users
**Purpose**: Fetch currently active users (admin only)
**Response**:
```json
{
  "success": true,
  "activeUsers": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "accountName": "John Doe",
      "email": "john@example.com",
      "ipAddress": "192.168.1.1",
      "browser": "Chrome",
      "currentPage": "Dashboard",
      "lastActivity": "2024-01-01T12:00:00Z",
      "isGuest": false,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/admin/daily-stats
**Purpose**: Fetch daily visit statistics (admin only)
**Response**:
```json
{
  "success": true,
  "stats": {
    "totalVisitsToday": 150,
    "uniqueVisitorsToday": 45,
    "date": "2024-01-01"
  }
}
```

## Frontend Implementation

### useActivityTracking Hook

```typescript
import { useActivityTracking } from '../utils/useActivityTracking';

// In your component
useActivityTracking({
  enabled: true,
  trackInterval: 30, // seconds
  trackPageChanges: true,
  trackUserInteraction: true
});
```

**Features**:
- Automatic tracking on mount
- Periodic tracking every 30 seconds
- Page change tracking
- User interaction tracking (mouse, keyboard, scroll)
- Visibility change tracking
- Window focus tracking
- Rate limiting (minimum 5 seconds between tracks)

### ActiveUsersSection Component

**Features**:
- Real-time display of active users
- Daily visit statistics
- Connection status monitoring
- Manual refresh capability
- Error handling and retry logic
- Responsive design

## Security

### Authentication
- Admin endpoints require admin authentication
- Uses Supabase RLS policies
- Service role bypass for internal operations

### Data Privacy
- IP addresses are stored for analytics
- User data is minimal and anonymized for guests
- Session IDs are used for tracking, not personal data

### Rate Limiting
- Frontend tracking is rate-limited (5-second minimum)
- API endpoints have built-in protection

## Performance

### Optimization
- Database indexes on frequently queried columns
- Automatic cleanup of inactive users
- Efficient polling intervals
- Minimal data transfer

### Scalability
- Stateless API design
- Database functions for complex operations
- Efficient queries with proper indexing

## Monitoring

### Logging
- Development mode logging for debugging
- Error tracking and reporting
- Performance monitoring

### Health Checks
- Connection status monitoring
- Automatic retry on failures
- Graceful degradation

## Usage Instructions

### For Admins
1. Log into the admin dashboard at `/admin`
2. Navigate to the "Dashboard" tab
3. View the "Active Users & Analytics" section
4. Monitor real-time user activity
5. Use the refresh button for manual updates

### For Developers
1. The system is automatically enabled for all users
2. No additional setup required
3. Activity tracking starts on page load
4. Admin dashboard shows live data

## Troubleshooting

### Common Issues

**No active users showing**
- Check if users are actually visiting the site
- Verify database functions exist
- Check admin authentication

**Connection lost**
- Check network connectivity
- Verify API endpoints are accessible
- Check database connection

**Data not updating**
- Verify tracking API is working
- Check browser console for errors
- Ensure middleware is running

### Debug Mode
- Set `NODE_ENV=development` for detailed logging
- Check browser console for tracking logs
- Monitor network requests in browser dev tools

## Future Enhancements

### Potential Improvements
- WebSocket support for real-time updates
- More detailed analytics
- User journey tracking
- Geographic location tracking
- Device type detection
- Session recording capabilities

### Scalability Considerations
- Redis caching for high-traffic scenarios
- Database partitioning for large datasets
- CDN integration for global tracking
- Microservice architecture for tracking service 