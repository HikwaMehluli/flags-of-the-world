import "./analytics.js";
import "./driver-js-theme.js";
import "./game.js";
import "./navigation.js";
import "./profile-stats.js";
import "./scores-display.js";
import "./theme.js";

// Initialize IndexedDB
import offlineDB from './db/offline-db.js';

async function initializeApp() {
  try {
    await offlineDB.open();
    console.log('App initialized with IndexedDB');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

initializeApp();
