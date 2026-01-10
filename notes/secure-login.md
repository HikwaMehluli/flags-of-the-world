# Supabase Authentication and Global Scoring System Implementation Plan

## Overview
This document outlines the implementation plan for integrating Supabase-based authentication and a global scoring system into the Flags of the World game. The system will allow users to log in securely and view global scores from all players when authenticated, while maintaining local storage functionality for anonymous users.

## Goals
1. Implement secure Supabase-based authentication system
2. Create a global scoring database that stores user scores
3. Enable authenticated users to view global leaderboards
4. Maintain local storage functionality for anonymous users
5. Ensure clean, DRY, and lean code implementation

## Technical Architecture

### Supabase Setup
- **Authentication**: Email/password, social login (Google, Facebook, GitHub)
- **Database**: PostgreSQL database with tables for users and scores
- **Real-time**: Optional real-time score updates

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Scores Table
```sql
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, -- Player's display name
  moves INTEGER NOT NULL, -- Number of moves taken
  time TEXT NOT NULL, -- Time taken (formatted as MM:SS)
  difficulty TEXT NOT NULL, -- Game difficulty (easy, medium, hard)
  region TEXT NOT NULL, -- Game region (e.g., "africa - southern")
  player_country TEXT, -- Player's selected country
  continent TEXT NOT NULL, -- Game continent (africa, america, asia, europe)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scores_continent_difficulty_moves_time ON scores (continent, difficulty, moves, time);
CREATE INDEX idx_scores_user_id ON scores (user_id);
```

## Implementation Steps

### Phase 1: Supabase Project Setup and Configuration

1. **Create Supabase Account and Project**
   - Sign up for Supabase account
   - Create new project named "flags-of-the-world"
   - Note down Project URL and Anonymous/Public API keys

2. **Configure Authentication Settings**
   - Enable email/password authentication
   - Enable social providers (Google, Facebook, GitHub)
   - Configure email templates
   - Set up redirect URLs

3. **Set Up Database Tables**
   - Create users table with schema defined above
   - Create scores table with schema defined above
   - Set up Row Level Security (RLS) policies
   - Create indexes for performance optimization

4. **Environment Variables Setup**
   - Add Supabase credentials to `.env` file
   - Update `.env.example` with placeholder values
   - Configure webpack to handle environment variables

### Phase 2: Frontend Authentication System

1. **Install Dependencies**
   - Install `@supabase/supabase-js` client library
   - Update `package.json` with new dependency

2. **Create Authentication Service Module**
   - Create `js/auth-service.js` module
   - Initialize Supabase client with environment variables
   - Implement sign up, sign in, sign out functions
   - Implement session management
   - Implement user profile retrieval

3. **Update HTML Templates**
   - Modify `index.html` to include login/logout UI elements
   - Add authentication status indicator
   - Create login modal/popup on each HTML page
   - Update scores page to show login status

4. **Authentication UI Components**
   - Login button in header
   - User profile dropdown when logged in
   - Login modal with email/password form
   - Social login buttons
   - Logout confirmation

### Phase 3: Global Scoring System

1. **Create Score Service Module**
   - Create `js/score-service.js` module
   - Implement functions to save scores to Supabase
   - Implement functions to fetch global scores
   - Implement functions to fetch user's personal scores
   - Add caching layer to minimize API calls

2. **Modify Score Saving Logic**
   - Update `saveScore` function in `game.js`
   - When user is authenticated, save to both local storage and Supabase
   - When user is not authenticated, save only to local storage
   - Handle offline scenarios gracefully

3. **Update Score Display Logic**
   - Modify `scores-display.js` to conditionally load scores
   - When authenticated: fetch and display global scores
   - When not authenticated: display only local storage scores
   - Add toggle to switch between global and personal scores

### Phase 4: User Interface Updates

1. **Header Navigation Updates**
   - Add login/logout button to header
   - Show user profile when authenticated
   - Update navigation based on authentication status

2. **Sidebar Real-Time Activity Indicator**
   - Add a new UI element in the sidebar showing number of currently logged-in users
   - Implement a pulsing green light animation to indicate active users
   - Use Supabase Realtime to track online users
   - Create a "Currently Playing" section in the sidebar with:
     - Pulsing green circle indicator
     - Dynamic count of online users
     - Real-time updates using Supabase subscriptions
   - Add CSS animations for the pulsing effect
   - Implement presence tracking using Supabase Realtime channels

3. **Game Page Updates**
   - Add authentication status indicator
   - Update score submission modal to handle authenticated users
   - Add option to auto-populate Full Name and Country from user profile after game won
   - Add option to link local scores to account on first login

4. **Scores Page Updates**
   - Add authentication status banner
   - Implement tabs for "Global Scores" vs "Personal Scores"
   - Add login prompt when viewing global scores while not authenticated
   - Add loading indicators for global score fetching

5. **User Profile Page**
   - Create a dedicated profile page (profile.html) for authenticated users
   - Display user's profile information:
     - Full Name (with option to edit)
     - Country (with option to edit)
     - Avatar/profile picture
     - Registration date
   - Show comprehensive game statistics using Chart.js:
     - Total games played over time (line chart)
     - Monthly game activity (bar chart)
     - Performance by difficulty level (pie chart)
     - Performance by continent (radar chart)
     - Personal best scores by continent and difficulty
   - Display user rankings:
     - Overall global ranking
     - Continent-specific rankings
     - Monthly leaderboard position
     - Achievement badges earned
   - Allow users to update their profile information (name, country, avatar)
   - Include a clear red "Delete Account" button that completely removes user data:
     - Removes user from Supabase Auth system
     - Deletes all associated scores from the database including reset the localStorage
     - Removes user profile information
     - Provides confirmation dialog before deletion
     - Logs user out after successful deletion

### Phase 5: Security and Privacy Features

1. **Row Level Security (RLS) Policies**
   - Users can only update their own profiles
   - Scores are publicly readable but only creatable by authenticated users
   - Prevent unauthorized data access

2. **Rate Limiting**
   - Implement rate limiting on score submissions
   - Prevent spam submissions
   - Add validation for reasonable score values

3. **Data Validation**
   - Validate score data before insertion
   - Prevent cheating by validating minimum possible times/moves
   - Sanitize user inputs

### Phase 6: Testing and Quality Assurance

1. **Unit Tests**
   - Test authentication service functions
   - Test score service functions
   - Test edge cases and error handling

2. **Integration Tests**
   - Test end-to-end authentication flow
   - Test score saving and retrieval
   - Test UI state changes based on authentication

3. **User Experience Testing**
   - Test login flows across different browsers
   - Test responsive design for authentication modals
   - Test offline scenarios

## Detailed Implementation Notes

### Authentication Flow
1. User clicks "Login" button
2. Login modal appears with email/password and social login options
3. On successful authentication:
   - Store session in memory
   - Update UI to show user profile
   - Refresh scores page to show global scores
4. On logout:
   - Clear session
   - Update UI to show login button
   - Refresh scores page to show local scores

### Real-Time Online Users Tracking
1. Create a presence table in Supabase:
   ```sql
CREATE TABLE presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id TEXT UNIQUE, -- Unique identifier for browser session
  last_seen TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE
);
```
2. When user logs in:
   - Subscribe to the presence channel
   - Insert/update presence record for the user
   - Set up heartbeat to maintain online status
3. Implement real-time subscription:
   - Listen for INSERT, UPDATE, DELETE operations on presence table
   - Update the online user count in real-time
   - Update the UI with the pulsing indicator animation
4. When user navigates away or closes tab:
   - Remove presence record or set is_online to FALSE
   - Unsubscribe from the presence channel
5. Handle connection failures gracefully:
   - Fallback to cached count if real-time connection fails
   - Retry connection with exponential backoff

### Profile Page Implementation
1. Create profile.html with the following sections:
   - User profile header with avatar, name, and country
   - Navigation tabs for different profile sections
   - Statistics dashboard with Chart.js visualizations
   - Rankings display with global and continent-specific positions
   - Achievement/badge display
   - Profile editing form

2. Implement profile statistics calculations:
   - Total games played: Count all scores for the user
   - Games over time: Group scores by date (daily/weekly/monthly)
   - Monthly activity: Aggregate scores by month
   - Performance by difficulty: Calculate average moves/time by difficulty
   - Performance by continent: Calculate average moves/time by continent
   - Personal bests: Find best scores by continent and difficulty
   - Global rankings: Calculate user's position compared to all players
   - Continent rankings: Calculate user's position per continent

3. Auto-populate game modal with profile data:
   - When user wins a game, pre-fill the name and country fields with profile data
   - Allow user to modify before submitting score
   - Update profile data if user changes it during score submission

### Account Deletion Implementation
1. Create a secure account deletion function in auth-service.js:
   - Verify user identity before deletion
   - Remove all scores associated with the user ID
   - Delete user profile information from users table
   - Delete user from Supabase Auth system using service role key (server-side)
   - Handle cascading deletions properly
2. Implement client-side confirmation dialog:
   - Warning message about permanent data loss
   - Require user to type "DELETE" to confirm
   - Provide 5-second countdown option to cancel
3. Handle deletion success/failure:
   - Clear all local storage and session data
   - Redirect to home page after successful deletion
   - Show appropriate success/error messages
4. Ensure GDPR compliance:
   - Log deletion request for audit purposes
   - Remove all personal data permanently
   - Update any related records appropriately

### Score Synchronization
1. When user logs in for the first time:
   - Ask if they want to sync local scores to their account
   - If yes, upload local scores to Supabase
2. When user is authenticated:
   - New scores are saved to both local storage and Supabase
   - Local scores remain as backup
3. When user logs out:
   - Continue using local storage scores
   - Supabase scores remain accessible when logged in

### Error Handling Strategy
1. Network errors: Gracefully fall back to local storage
2. Authentication errors: Clear session and show error message
3. Rate limiting: Show appropriate message and prevent further attempts
4. Validation errors: Show specific error messages to user

### Performance Optimization
1. Cache global scores for 5 minutes to reduce API calls
2. Use pagination for global scores (top 50 per continent)
3. Lazy load score data when switching between continents
4. Debounce score submission to prevent duplicate requests

## File Structure Changes

### New Files
- `js/auth-service.js` - Authentication logic
- `js/score-service.js` - Score management logic
- `js/presence-service.js` - Real-time online users tracking
- `js/profile-service.js` - User profile and statistics management
- `js/components/auth-modal.js` - Authentication UI component
- `js/components/user-profile.js` - User profile UI component
- `js/components/online-users-indicator.js` - Real-time online users UI component
- `js/components/profile-stats.js` - Profile statistics visualization component
- `profile.html` - Dedicated user profile page
- `js/charts-config.js` - Chart.js configurations for profile statistics

### Modified Files
- `js/game.js` - Updated saveScore function
- `js/scores-display.js` - Conditional score loading
- `js/navigation.js` - Authentication-aware navigation
- `index.html` - Added authentication UI elements
- `scores.html` - Updated to support global/local scores
- `package.json` - Added Supabase dependency and Chart.js
- `.env.example` - Added Supabase configuration

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Third-party Dependencies
- `@supabase/supabase-js` - Supabase client library for authentication and database operations
- `chart.js` - JavaScript charting library for data visualization

## Security Considerations

1. **Client-Side Security**
   - Never expose service role keys in client code
   - Use anonymous key which has limited permissions
   - Implement proper RLS policies on the database

2. **Data Privacy**
   - Allow users to delete their accounts and associated data
   - Provide option to use pseudonyms instead of real names
   - Comply with privacy regulations (GDPR, etc.)

3. **Input Validation**
   - Validate all user inputs on both client and server
   - Prevent XSS attacks through proper sanitization
   - Implement rate limiting to prevent abuse

## Deployment Considerations

1. **Environment Configuration**
   - Set up production Supabase project
   - Configure environment variables for production
   - Set up custom domain for Supabase project

2. **Monitoring**
   - Set up error tracking for authentication issues
   - Monitor database performance
   - Track user engagement with global scores

3. **Backup Strategy**
   - Regular database backups
   - Version control for database schema changes
   - Disaster recovery plan

## Success Metrics

1. **User Engagement**
   - Increase in return visitors
   - Time spent on scores page
   - Number of scores submitted per user

2. **Authentication Adoption**
   - Percentage of users who log in
   - Number of registered users
   - Social login adoption rate

3. **Performance**
   - Page load times with global scores
   - API response times
   - Error rates for authentication

This implementation plan provides a comprehensive roadmap for adding secure authentication and global scoring to the Flags of the World game while maintaining clean, DRY, and lean code practices.