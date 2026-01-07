# Flags of the World - User Authentication and Score Management Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for adding user accounts, country-based scores, and Supabase integration to the Flags of the World memory game.

## Current State
- The game currently uses localStorage to store top 10 scores locally
- No user authentication system
- Scores are anonymous with just player name, moves, time, difficulty, and region
- No backend or database integration

## Requirements Analysis

### 1. User Accounts for International/Country-Based Scores
- Implement user registration/login with Facebook, Google, and email
- Store user country information
- Link scores to authenticated users

### 2. User Country-Based Score Display
- Display scores filtered by user's country
- Show country-specific leaderboards
- Organize scores by region and country

### 3. Smart Search Filters/Dropdowns
- Region-based filtering (Africa, Europe, Asia, America)
- Country-based filtering
- Date range filtering
- Difficulty level filtering

### 4. Supabase Database Integration
- User authentication with Facebook, Google, and email
- Score records with user ID, country, region, moves, time, difficulty, date
- Automatic cleanup of scores not in top 50 per region/country

## Implementation Plan

### Phase 1: Supabase Setup and Authentication

#### Step 1.1: Set up Supabase Project
- Create Supabase account and project
- Configure authentication providers (Google, Facebook, Email)
- Set up database tables

#### Step 1.2: Database Schema
```sql
-- Users table (extends Supabase auth.users)
-- This will be handled automatically by Supabase with Row Level Security

-- Scores table
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_country TEXT NOT NULL,
  region TEXT NOT NULL, -- e.g., "africa - southern", "europe - western"
  continent TEXT NOT NULL, -- e.g., "africa", "europe"
  moves INTEGER NOT NULL,
  time TEXT NOT NULL, -- formatted as "MM:SS"
  difficulty TEXT NOT NULL, -- "easy", "medium", "hard"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_user_id (user_id),
  INDEX idx_region (region),
  INDEX idx_continent (continent),
  INDEX idx_user_country (user_country),
  INDEX idx_created_at (created_at),
  INDEX idx_moves_time (moves, time)
);

-- Function to maintain top 50 scores per region/country
CREATE OR REPLACE FUNCTION cleanup_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete scores that are not in top 50 for the region
  DELETE FROM scores 
  WHERE id NOT IN (
    SELECT id 
    FROM scores s2 
    WHERE s2.region = NEW.region 
    ORDER BY s2.moves ASC, s2.time ASC 
    LIMIT 50
  )
  AND region = NEW.region;
  
  -- Also delete scores that are not in top 50 for the user's country
  DELETE FROM scores 
  WHERE id NOT IN (
    SELECT id 
    FROM scores s2 
    WHERE s2.user_country = NEW.user_country 
    ORDER BY s2.moves ASC, s2.time ASC 
    LIMIT 50
  )
  AND user_country = NEW.user_country;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after each insert
CREATE TRIGGER trigger_cleanup_scores
  AFTER INSERT ON scores
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_scores();
```

#### Step 1.3: Install Supabase Client
```bash
npm install @supabase/supabase-js
```

#### Step 1.4: Create Supabase Configuration
Create `js/config/supabase.js`:
```javascript
// Supabase client initialization
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

#### Step 1.5: Update Webpack Configuration
Update `webpack.config.js` to handle the new modules:
```javascript
const path = require('path');

const commonOutputPath = path.resolve(__dirname, 'dist');

const createConfig = (entryFile, outputFilename, name) => ({
    mode: 'production',
    entry: `./js/${entryFile}`,
    output: {
        filename: outputFilename,
        path: commonOutputPath,
    },
    name,
});

module.exports = [
    createConfig('_entry.js', 'app.js', 'app'),
];
```

### Phase 2: Authentication System

#### Step 2.1: Create Authentication Module
Create `js/auth/authManager.js`:
```javascript
import { supabase } from '../config/supabase.js';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.setupAuthListener();
  }

  setupAuthListener() {
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.currentUser = session.user;
        this.onUserAuthenticated(session.user);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.onUserLoggedOut();
      }
    });
  }

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async signInWithFacebook() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error('Error signing in with Facebook:', error);
      throw error;
    }
  }

  async signInWithEmail(email, password) {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
    
    return data;
  }

  async signUpWithEmail(email, password, userData) {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // { name, country, etc. }
      }
    });
    
    if (error) {
      console.error('Error signing up:', error);
      throw error;
    }
    
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async getUserProfile() {
    if (!this.currentUser) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.currentUser.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  }

  async updateUserProfile(updates) {
    if (!this.currentUser) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', this.currentUser.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
    
    return data;
  }

  onUserAuthenticated(user) {
    // Trigger custom event for other modules
    window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: user }));
  }

  onUserLoggedOut() {
    // Trigger custom event for other modules
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
  }
}
```

#### Step 2.2: Update Entry Point
Update `js/_entry.js` to include auth:
```javascript
import "./game.js";
import "./navigation.js";
import "./scores-display.js";
import "./theme.js";
import "./auth/authManager.js";
```

### Phase 3: Enhanced Score Management

#### Step 3.1: Create Score Manager
Create `js/score/scoreManager.js`:
```javascript
import { supabase } from '../config/supabase.js';

export class ScoreManager {
  constructor() {
    this.authManager = null; // Will be set by main game class
  }

  async saveScore(scoreData) {
    if (!this.authManager || !this.authManager.currentUser) {
      // Fallback to localStorage if not authenticated
      this.saveScoreToLocalStorage(scoreData);
      return;
    }

    const userProfile = await this.authManager.getUserProfile();
    
    const { error } = await supabase
      .from('scores')
      .insert([{
        user_id: this.authManager.currentUser.id,
        user_name: scoreData.name || userProfile?.name || 'Anonymous',
        user_country: userProfile?.country || 'Unknown',
        region: scoreData.region,
        continent: scoreData.continent || this.extractContinent(scoreData.region),
        moves: scoreData.moves,
        time: scoreData.time,
        difficulty: scoreData.difficulty,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error saving score:', error);
      // Fallback to localStorage if database fails
      this.saveScoreToLocalStorage(scoreData);
      throw error;
    }
  }

  async getTopScores(limit = 50, filters = {}) {
    let query = supabase
      .from('scores')
      .select('*')
      .order('moves', { ascending: true })
      .order('time', { ascending: true })
      .limit(limit);

    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    
    if (filters.continent) {
      query = query.eq('continent', filters.continent);
    }
    
    if (filters.country) {
      query = query.eq('user_country', filters.country);
    }
    
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching scores:', error);
      return [];
    }

    return data;
  }

  async getUserScores(userId, limit = 50) {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user scores:', error);
      return [];
    }

    return data;
  }

  extractContinent(region) {
    // Extract continent from region string (e.g., "africa - southern" -> "africa")
    return region.split(' - ')[0];
  }

  saveScoreToLocalStorage(scoreData) {
    const newScore = { 
      ...scoreData, 
      timestamp: Date.now() 
    };
    const highScores = JSON.parse(localStorage.getItem('highScores')) || [];
    highScores.push(newScore);
    highScores.sort((a, b) => a.moves - b.moves || a.time.localeCompare(b.time));
    highScores.splice(10); // Keep only top 10 for localStorage fallback
    localStorage.setItem('highScores', JSON.stringify(highScores));
  }
}
```

### Phase 4: Updated Game Logic

#### Step 4.1: Modify Game Class
Update `js/game.js` to integrate with authentication and score management:

```javascript
import { AuthManager } from './auth/authManager.js';
import { ScoreManager } from './score/scoreManager.js';

class FlagsofWorld {
  constructor() {
    // Initialize auth and score managers
    this.authManager = new AuthManager();
    this.scoreManager = new ScoreManager();
    this.scoreManager.authManager = this.authManager; // Set reference for auth checks
    
    // Store current user info
    this.currentUser = null;
    
    // Listen for auth events
    window.addEventListener('userAuthenticated', (e) => {
      this.currentUser = e.detail;
      this.updateUIForAuthState(true);
    });
    
    window.addEventListener('userLoggedOut', () => {
      this.currentUser = null;
      this.updateUIForAuthState(false);
    });

    // --- Game State ---
    // ... existing game state variables ...
    
    // --- UI Elements ---
    // ... existing UI elements ...
    
    // Add auth-related UI elements
    this.authContainer = document.getElementById('auth-container');
    this.userNameDisplay = document.getElementById('user-name-display');
    
    // --- Game Settings ---
    // ... existing game settings ...
    
    // --- Setup ---
    this.initializeSelectors();
    this.updateRegionSelector().then(() => {
      this.startNewGame();
    });
  }

  updateUIForAuthState(isAuthenticated) {
    if (this.userNameDisplay) {
      if (isAuthenticated && this.currentUser) {
        this.userNameDisplay.textContent = this.currentUser.user_metadata?.name || this.currentUser.email;
      } else {
        this.userNameDisplay.textContent = 'Guest';
      }
    }
  }

  // ... existing methods ...

  async saveScore(name, moves, time, difficulty, region) {
    const continent = this.continent; // Get current continent
    const scoreData = { 
      name: name, 
      moves, 
      time, 
      difficulty, 
      region: `${continent} - ${region}`,
      continent: continent
    };
    
    try {
      await this.scoreManager.saveScore(scoreData);
      console.log('Score saved successfully');
    } catch (error) {
      console.error('Error saving score:', error);
      // Show user-friendly error message
      alert('Score saved locally. Will sync when online.');
    }
  }

  // ... rest of existing methods ...
}
```

### Phase 5: Enhanced Scores Page

#### Step 5.1: Update Scores HTML
Update `scores.html` to include filtering and authentication UI:

```html
<!DOCTYPE html>
<html lang="en">
<!-- ... existing head content ... -->
<body>
  <header>
    <div class="menu-icon" id="menu-icon"><span class="menu-text">MENU</span></div>
    <div class="theme-switcher" title="Toggle Theme">
      <button id="theme-toggle" aria-label="Toggle theme">
        <span class="icon"></span>
      </button>
    </div>
    <!-- Auth section -->
    <div id="auth-container" class="auth-section">
      <span id="user-name-display">Guest</span>
      <button id="auth-toggle-btn">Sign In</button>
    </div>
  </header>

  <!-- ... existing sidebar ... -->

  <main class="game-container">
    <section class="game-header">
      <h1 class="game-title">High Scores</h1>
      <p class="game-description">Can you beat them?</p>
    </section>

    <!-- Filter controls -->
    <section class="filters-section">
      <div class="filter-group">
        <label for="continent-filter">Continent:</label>
        <select id="continent-filter">
          <option value="">All Continents</option>
          <option value="africa">Africa</option>
          <option value="europe">Europe</option>
          <option value="asia">Asia</option>
          <option value="america">America</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="region-filter">Region:</label>
        <select id="region-filter">
          <option value="">All Regions</option>
          <!-- Populated dynamically -->
        </select>
      </div>
      
      <div class="filter-group">
        <label for="country-filter">Country:</label>
        <select id="country-filter">
          <option value="">All Countries</option>
          <!-- Populated dynamically -->
        </select>
      </div>
      
      <div class="filter-group">
        <label for="difficulty-filter">Difficulty:</label>
        <select id="difficulty-filter">
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </section>

    <section>
      <ol id="high-scores-list"></ol>
      <div id="no-scores-container" style="display: none;">
        <p>No scores yet. Play a game to see your score here!</p>
        <a href="index.html" class="btn-play-game">Play Now</a>
      </div>
    </section>

    <!-- Auth modal -->
    <div id="auth-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content">
        <button class="close-modal" aria-label="Close modal">&times;</button>
        <h2>Sign In to Your Account</h2>
        <div class="auth-options">
          <button id="google-auth-btn" class="auth-btn google-btn">Sign in with Google</button>
          <button id="facebook-auth-btn" class="auth-btn facebook-btn">Sign in with Facebook</button>
          <div class="divider">or</div>
          <form id="email-auth-form">
            <input type="email" id="auth-email" placeholder="Email" required />
            <input type="password" id="auth-password" placeholder="Password" required />
            <button type="submit">Sign In</button>
          </form>
          <p><a href="#" id="switch-auth-mode">Create Account</a></p>
        </div>
      </div>
    </div>

    <footer>
      <!-- ... existing footer ... -->
    </footer>
  </main>

  <script src="./dist/app.js" defer></script>
</body>
</html>
```

#### Step 5.2: Create Enhanced Scores Display
Create `js/scores/scoresDisplayEnhanced.js`:
```javascript
import { ScoreManager } from '../score/scoreManager.js';
import { AuthManager } from '../auth/authManager.js';

export class ScoresDisplayEnhanced {
  constructor() {
    this.scoreManager = new ScoreManager();
    this.authManager = new AuthManager();
    
    this.highScoresList = document.getElementById('high-scores-list');
    this.noScoresContainer = document.getElementById('no-scores-container');
    this.continentFilter = document.getElementById('continent-filter');
    this.regionFilter = document.getElementById('region-filter');
    this.countryFilter = document.getElementById('country-filter');
    this.difficultyFilter = document.getElementById('difficulty-filter');
    
    this.authModal = document.getElementById('auth-modal');
    this.authToggleBtn = document.getElementById('auth-toggle-btn');
    this.googleAuthBtn = document.getElementById('google-auth-btn');
    this.facebookAuthBtn = document.getElementById('facebook-auth-btn');
    this.emailAuthForm = document.getElementById('email-auth-form');
    this.closeModalButton = document.querySelector('.close-modal');
    
    this.currentFilters = {};
    
    this.initializeEventListeners();
    this.loadScores();
    
    // Listen for auth events
    window.addEventListener('userAuthenticated', () => {
      this.updateAuthUI();
      this.loadScores();
    });
    
    window.addEventListener('userLoggedOut', () => {
      this.updateAuthUI();
      this.loadScores();
    });
  }
  
  initializeEventListeners() {
    // Filter event listeners
    if (this.continentFilter) {
      this.continentFilter.addEventListener('change', () => {
        this.updateRegionOptions();
        this.applyFilters();
      });
    }
    
    if (this.regionFilter) {
      this.regionFilter.addEventListener('change', () => this.applyFilters());
    }
    
    if (this.countryFilter) {
      this.countryFilter.addEventListener('change', () => this.applyFilters());
    }
    
    if (this.difficultyFilter) {
      this.difficultyFilter.addEventListener('change', () => this.applyFilters());
    }
    
    // Auth event listeners
    if (this.authToggleBtn) {
      this.authToggleBtn.addEventListener('click', () => {
        this.authModal.style.display = 'flex';
      });
    }
    
    if (this.googleAuthBtn) {
      this.googleAuthBtn.addEventListener('click', async () => {
        try {
          await this.authManager.signInWithGoogle();
          this.authModal.style.display = 'none';
        } catch (error) {
          console.error('Google auth error:', error);
          alert('Authentication failed. Please try again.');
        }
      });
    }
    
    if (this.facebookAuthBtn) {
      this.facebookAuthBtn.addEventListener('click', async () => {
        try {
          await this.authManager.signInWithFacebook();
          this.authModal.style.display = 'none';
        } catch (error) {
          console.error('Facebook auth error:', error);
          alert('Authentication failed. Please try again.');
        }
      });
    }
    
    if (this.emailAuthForm) {
      this.emailAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        
        try {
          await this.authManager.signInWithEmail(email, password);
          this.authModal.style.display = 'none';
        } catch (error) {
          console.error('Email auth error:', error);
          alert('Authentication failed. Please check your credentials.');
        }
      });
    }
    
    if (this.closeModalButton) {
      this.closeModalButton.addEventListener('click', () => {
        this.authModal.style.display = 'none';
      });
    }
    
    if (this.authModal) {
      this.authModal.addEventListener('click', (event) => {
        if (event.target === this.authModal) {
          this.authModal.style.display = 'none';
        }
      });
    }
  }
  
  updateRegionOptions() {
    const continent = this.continentFilter.value;
    this.regionFilter.innerHTML = '<option value="">All Regions</option>';
    
    if (continent) {
      // Define regions for each continent
      const regions = {
        africa: [
          'North Africa', 'Southern Africa', 'East Africa', 
          'West Africa', 'Central Africa'
        ],
        europe: [
          'Northern Europe', 'Western Europe', 'Southern Europe', 
          'Eastern Europe'
        ],
        asia: [
          'Central Asia', 'Eastern Asia', 'South-Eastern Asia', 
          'Southern Asia', 'Western Asia'
        ],
        america: [
          'Northern America', 'Caribbean', 'Central America', 
          'South America'
        ]
      };
      
      if (regions[continent]) {
        regions[continent].forEach(region => {
          const option = document.createElement('option');
          option.value = `${continent} - ${region.toLowerCase().replace(' ', '-')}`;
          option.textContent = region;
          this.regionFilter.appendChild(option);
        });
      }
    }
  }
  
  async loadScores() {
    if (!this.highScoresList || !this.noScoresContainer) return;
    
    try {
      const scores = await this.scoreManager.getTopScores(50, this.currentFilters);
      
      if (scores.length > 0) {
        this.highScoresList.style.display = 'block';
        this.noScoresContainer.style.display = 'none';
        this.highScoresList.innerHTML = scores.map((score, index) => 
          this.createScoreListItem(score, index + 1)
        ).join('');
      } else {
        this.highScoresList.style.display = 'none';
        this.noScoresContainer.style.display = 'block';
      }
    } catch (error) {
      console.error('Error loading scores:', error);
      this.highScoresList.style.display = 'none';
      this.noScoresContainer.style.display = 'block';
      // Show error message
      this.noScoresContainer.innerHTML = '<p>Error loading scores. Please try again later.</p>';
    }
  }
  
  applyFilters() {
    this.currentFilters = {
      continent: this.continentFilter.value || undefined,
      region: this.regionFilter.value || undefined,
      country: this.countryFilter.value || undefined,
      difficulty: this.difficultyFilter.value || undefined
    };
    
    this.loadScores();
  }
  
  createScoreListItem(score, rank) {
    const regionText = this.formatRegion(score.region);
    const date = new Date(score.created_at).toLocaleDateString();
    
    return `
      <li class="score-item">
        <span class="rank">#${rank}</span>
        <span class="player-name">${score.user_name}</span>
        <span class="score-details">
          ${score.moves} moves - ${score.time}
        </span>
        <span class="game-level">
          ${score.difficulty} - ${regionText}
        </span>
        <span class="country">${score.user_country}</span>
        <span class="date">${date}</span>
      </li>
    `;
  }
  
  formatRegion(regionString) {
    if (typeof regionString !== 'string' || !regionString) {
      return 'Unknown Region';
    }

    return regionString
      .split(' - ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' - ');
  }
  
  updateAuthUI() {
    // Update auth UI based on current auth state
    const userNameDisplay = document.getElementById('user-name-display');
    if (userNameDisplay) {
      if (this.authManager.currentUser) {
        const user = this.authManager.currentUser;
        userNameDisplay.textContent = user.user_metadata?.name || user.email || 'User';
        this.authToggleBtn.textContent = 'Sign Out';
      } else {
        userNameDisplay.textContent = 'Guest';
        this.authToggleBtn.textContent = 'Sign In';
      }
    }
  }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  const scoresList = document.getElementById('high-scores-list');
  if (scoresList) {
    new ScoresDisplayEnhanced();
  }
});
```

### Phase 6: CSS Updates

#### Step 6.1: Update Styles for New Features
Update the SCSS files to include styles for authentication and filtering:

```scss
// Add to scss/_scores.scss or main SCSS file

.filters-section {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--card-bg);
  border-radius: var(--border-radius);
  
  .filter-group {
    display: flex;
    flex-direction: column;
    min-width: 150px;
    
    label {
      font-size: 0.9rem;
      margin-bottom: 0.3rem;
      color: var(--text-secondary);
    }
    
    select {
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      background: var(--input-bg);
      color: var(--text-primary);
    }
  }
}

.auth-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  
  #user-name-display {
    font-weight: bold;
  }
  
  #auth-toggle-btn {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: var(--border-radius);
    background: var(--primary-color);
    color: white;
    cursor: pointer;
    
    &:hover {
      background: var(--primary-color-hover);
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  
  .modal-content {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    max-width: 400px;
    width: 90%;
    position: relative;
    
    .close-modal {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-secondary);
    }
    
    .auth-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      
      .auth-btn {
        padding: 0.8rem;
        border: none;
        border-radius: var(--border-radius);
        color: white;
        cursor: pointer;
        font-weight: bold;
        
        &.google-btn {
          background: #4285F4;
        }
        
        &.facebook-btn {
          background: #1877F2;
        }
      }
      
      .divider {
        text-align: center;
        color: var(--text-secondary);
        position: relative;
        
        &::before,
        &::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: var(--border-color);
        }
        
        &::before {
          left: 0;
        }
        
        &::after {
          right: 0;
        }
      }
      
      #email-auth-form {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        
        input {
          padding: 0.7rem;
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          background: var(--input-bg);
          color: var(--text-primary);
        }
        
        button {
          padding: 0.8rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: var(--border-radius);
          cursor: pointer;
          
          &:hover {
            background: var(--primary-color-hover);
          }
        }
      }
    }
  }
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--border-color);
  
  .rank {
    font-weight: bold;
    color: var(--primary-color);
    min-width: 40px;
  }
  
  .player-name {
    flex: 1;
    font-weight: 500;
  }
  
  .score-details {
    min-width: 120px;
    text-align: center;
  }
  
  .game-level {
    min-width: 150px;
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .country {
    min-width: 100px;
    text-align: center;
    font-style: italic;
  }
  
  .date {
    min-width: 80px;
    text-align: right;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .filters-section {
    flex-direction: column;
    
    .filter-group {
      min-width: auto;
    }
  }
  
  .score-item {
    flex-wrap: wrap;
    gap: 0.5rem;
    
    .rank, .player-name, .score-details, .game-level, .country, .date {
      flex: 1 0 45%;
      text-align: left;
    }
    
    .date {
      text-align: right;
      flex: 1 0 100%;
    }
  }
}
```

### Phase 7: Environment Configuration

#### Step 7.1: Create Environment Configuration
Create `.env` file (and add to `.gitignore`):
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Step 7.2: Update Package.json
Add build scripts for environment handling:
```json
{
  "scripts": {
    "start": "http-server -c-1",
    "css-build": "sass --no-source-map --watch scss/_entry.scss:dist/app.css --style compressed",
    "js-build": "webpack --watch --config-name app",
    "build": "webpack --config-name app"
  }
}
```

### Phase 8: Testing and Deployment

#### Step 8.1: Create Test Files
Create basic tests to verify functionality:
- Test authentication flow
- Test score saving and retrieval
- Test filtering functionality

#### Step 8.2: Deployment Configuration
- Configure Supabase project for production
- Set up authentication redirects
- Configure security rules

## Implementation Priority

### Priority 1: Core Authentication
1. Set up Supabase project
2. Implement basic auth with email
3. Update game.js to use authenticated scores

### Priority 2: Database Integration
1. Create database schema
2. Implement score saving to database
3. Add fallback to localStorage

### Priority 3: Enhanced Features
1. Add Google/Facebook auth
2. Implement filtering and search
3. Create country-based leaderboards

### Priority 4: UI/UX Polish
1. Style auth modals
2. Improve filter UI
3. Add loading states

## Security Considerations

1. **Row Level Security (RLS)**: Enable RLS on Supabase tables to ensure users can only access appropriate data
2. **Rate Limiting**: Implement rate limiting for score submissions
3. **Input Validation**: Validate all inputs on both client and server
4. **Secure Redirects**: Ensure OAuth redirects are secure

## Performance Considerations

1. **Database Indexes**: Properly index database tables for efficient queries
2. **Caching**: Implement caching for frequently accessed data
3. **Pagination**: Implement pagination for large score lists
4. **Cleanup Function**: The database function will automatically maintain top 50 scores

This implementation plan provides a comprehensive approach to adding user accounts, country-based scores, and Supabase integration to the Flags of the World game while maintaining the existing functionality and user experience.