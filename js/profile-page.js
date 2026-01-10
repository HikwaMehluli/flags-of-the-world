/**
 * Profile page functionality
 */
document.addEventListener('DOMContentLoaded', async function() {
  // Check if we're on the profile page
  const profileContent = document.querySelector('.profile-content');
  if (!profileContent) return;

  // Initialize profile page
  await initializeProfilePage();
});

/**
 * Initialize the profile page
 */
async function initializeProfilePage() {
  try {
    // Initialize auth status and presence
    await initializeAuthAndPresence();
    
    // Load user profile
    await loadUserProfile();
    
    // Load user statistics
    await loadUserStatistics();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing profile page:', error);
  }
}

/**
 * Initialize authentication status and presence
 */
async function initializeAuthAndPresence() {
  try {
    const { default: authService } = await import('./auth-service.js');
    const { default: presenceService } = await import('./presence-service.js');
    
    // Initialize presence service
    await presenceService.initialize();
    
    // Listen for online users count changes
    document.addEventListener('onlineUsersCountChanged', (event) => {
      const onlineUsersCountElement = document.getElementById('online-users-count');
      if (onlineUsersCountElement) {
        onlineUsersCountElement.textContent = event.detail.count;
      }
    });
    
    // Update auth UI
    const isAuthenticated = authService.getIsAuthenticated();
    updateAuthUI(isAuthenticated);
    
    // Listen for auth state changes
    authService.onAuthStateChange(async ({ isAuthenticated }) => {
      updateAuthUI(isAuthenticated);
      if (isAuthenticated) {
        await loadUserProfile();
        await loadUserStatistics();
      } else {
        // Redirect to home page if not authenticated
        window.location.href = 'index.html';
      }
    });
  } catch (error) {
    console.error('Error initializing auth and presence:', error);
  }
}

/**
 * Update authentication UI
 */
function updateAuthUI(isAuthenticated) {
  const authIndicator = document.getElementById('auth-indicator');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  
  if (authIndicator && authToggleBtn) {
    if (isAuthenticated) {
      const currentUser = authService.getCurrentUser();
      const displayName = currentUser?.user_metadata?.full_name || 
                         currentUser?.user_metadata?.username || 
                         currentUser?.email?.split('@')[0] || 
                         'User';
      authIndicator.textContent = displayName;
      authToggleBtn.textContent = 'Logout';
    } else {
      authIndicator.textContent = 'Guest';
      authToggleBtn.textContent = 'Login';
    }
  }
}

/**
 * Load user profile information
 */
async function loadUserProfile() {
  try {
    const { default: authService } = await import('./auth-service.js');
    const { default: profileService } = await import('./profile-service.js');
    
    const user = authService.getCurrentUser();
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = 'index.html';
      return;
    }
    
    // Load user profile from database
    const profile = await profileService.getUserProfile();
    
    // Update profile fields
    document.getElementById('email').value = user.email || '';
    document.getElementById('username').value = user.user_metadata?.username || user.email?.split('@')[0] || '';
    document.getElementById('full-name').value = profile?.full_name || user.user_metadata?.full_name || '';
    
    // Set country if available
    if (profile?.player_country) {
      document.getElementById('user-country').value = profile.player_country;
    }
    
    // Load and display avatar if available
    if (profile?.avatar_url) {
      document.getElementById('user-avatar').src = profile.avatar_url;
    }
    
    // Populate country dropdown
    await populateCountryDropdown();
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

/**
 * Load user statistics
 */
async function loadUserStatistics() {
  try {
    const { default: profileService } = await import('./profile-service.js');
    
    // Get user stats
    const stats = await profileService.getUserStats();
    
    // Update stat cards
    document.getElementById('total-games').textContent = stats.totalGames;
    document.getElementById('best-moves').textContent = stats.bestMoves;
    document.getElementById('best-time').textContent = stats.bestTime;
    
    // Update rankings
    const rankings = await profileService.getUserRankings();
    document.getElementById('global-ranking').textContent = `#${rankings.global.rank}`;
    document.getElementById('africa-ranking').textContent = `#${rankings.africa.rank}`;
    document.getElementById('europe-ranking').textContent = `#${rankings.europe.rank}`;
    document.getElementById('asia-ranking').textContent = `#${rankings.asia.rank}`;
    document.getElementById('america-ranking').textContent = `#${rankings.america.rank}`;
    
    // Render charts
    renderCharts(stats);
  } catch (error) {
    console.error('Error loading user statistics:', error);
  }
}

/**
 * Render charts with user statistics
 */
async function renderCharts(stats) {
  try {
    // Import Chart.js configurations
    const { gamesOverTimeConfig, performanceByDifficultyConfig, performanceByContinentConfig } = await import('./charts-config.js');
    
    // Render games over time chart
    if (stats.gamesOverTime.dates.length > 0) {
      const ctx1 = document.getElementById('games-over-time-chart').getContext('2d');
      if (window.gamesOverTimeChart) {
        window.gamesOverTimeChart.destroy();
      }
      window.gamesOverTimeChart = new Chart(ctx1, {
        ...gamesOverTimeConfig,
        data: {
          labels: stats.gamesOverTime.dates,
          datasets: [{
            label: 'Games Played',
            data: stats.gamesOverTime.counts,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)'
          }]
        }
      });
    }
    
    // Render performance by difficulty chart
    const difficultyKeys = Object.keys(stats.performanceByDifficulty);
    if (difficultyKeys.length > 0) {
      const avgMoves = difficultyKeys.map(diff => stats.performanceByDifficulty[diff].avgMoves);
      const avgTimes = difficultyKeys.map(diff => stats.performanceByDifficulty[diff].avgTime);
      
      const ctx2 = document.getElementById('performance-by-difficulty-chart').getContext('2d');
      if (window.performanceByDifficultyChart) {
        window.performanceByDifficultyChart.destroy();
      }
      window.performanceByDifficultyChart = new Chart(ctx2, {
        ...performanceByDifficultyConfig,
        data: {
          labels: difficultyKeys,
          datasets: [
            {
              label: 'Average Moves',
              data: avgMoves,
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 1
            },
            {
              label: 'Average Time (seconds)',
              data: avgTimes,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1
            }
          ]
        }
      });
    }
    
    // Render performance by continent chart
    const continentKeys = Object.keys(stats.performanceByContinent);
    if (continentKeys.length > 0) {
      const avgMoves = continentKeys.map(cont => stats.performanceByContinent[cont].avgMoves);
      const avgTimes = continentKeys.map(cont => stats.performanceByContinent[cont].avgTime);
      
      const ctx3 = document.getElementById('performance-by-continent-chart').getContext('2d');
      if (window.performanceByContinentChart) {
        window.performanceByContinentChart.destroy();
      }
      window.performanceByContinentChart = new Chart(ctx3, {
        ...performanceByContinentConfig,
        data: {
          labels: continentKeys,
          datasets: [
            {
              label: 'Average Moves',
              data: avgMoves,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgb(75, 192, 192)',
              borderWidth: 1
            },
            {
              label: 'Average Time (seconds)',
              data: avgTimes,
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
              borderColor: 'rgb(153, 102, 255)',
              borderWidth: 1
            }
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error rendering charts:', error);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Save profile button
  const saveProfileBtn = document.getElementById('save-profile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', showLogoutConfirmation);
  }
  
  // Delete account button
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', showDeleteAccountConfirmation);
  }
  
  // Avatar upload
  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload) {
    avatarUpload.addEventListener('change', handleAvatarUpload);
  }
  
  // Delete account modal buttons
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteInput = document.getElementById('confirm-delete-input');
  
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', deleteAccount);
  }
  
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', hideDeleteAccountModal);
  }
  
  if (confirmDeleteInput) {
    confirmDeleteInput.addEventListener('input', validateDeleteConfirmation);
  }
  
  // Logout modal buttons
  const confirmLogoutBtn = document.getElementById('confirm-logout');
  const cancelLogoutBtn = document.getElementById('cancel-logout');
  
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', performLogout);
  }
  
  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', hideLogoutModal);
  }
  
  // Auth toggle button
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', toggleAuth);
  }
  
  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    const deleteModal = document.getElementById('delete-account-modal');
    const logoutModal = document.getElementById('logout-modal');
    const loginModal = document.getElementById('login-modal');
    
    if (event.target === deleteModal) {
      hideDeleteAccountModal();
    }
    if (event.target === logoutModal) {
      hideLogoutModal();
    }
    if (event.target === loginModal) {
      loginModal.style.display = 'none';
    }
  });
  
  // Close modals with close buttons
  const closeModalButtons = document.querySelectorAll('.close-modal');
  closeModalButtons.forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('.modal-overlay');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });
}

/**
 * Save profile information
 */
async function saveProfile() {
  try {
    const { default: profileService } = await import('./profile-service.js');
    
    const profileData = {
      full_name: document.getElementById('full-name').value,
      player_country: document.getElementById('user-country').value
    };
    
    await profileService.updateUserProfile(profileData);
    
    alert('Profile updated successfully!');
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('Error saving profile: ' + error.message);
  }
}

/**
 * Handle avatar upload
 */
async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // In a real implementation, you would upload the image to a storage service
  // For now, we'll just display the selected image
  
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('user-avatar').src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * Show logout confirmation
 */
function showLogoutConfirmation() {
  document.getElementById('logout-modal').style.display = 'flex';
}

/**
 * Hide logout modal
 */
function hideLogoutModal() {
  document.getElementById('logout-modal').style.display = 'none';
}

/**
 * Perform logout
 */
async function performLogout() {
  try {
    const { default: authService } = await import('./auth-service.js');
    await authService.signOut();
    hideLogoutModal();
    // User will be redirected by the auth state change listener
  } catch (error) {
    console.error('Error logging out:', error);
    alert('Error logging out: ' + error.message);
  }
}

/**
 * Show delete account confirmation
 */
function showDeleteAccountConfirmation() {
  document.getElementById('delete-account-modal').style.display = 'flex';
  document.getElementById('confirm-delete-input').value = '';
  document.getElementById('confirm-delete-btn').disabled = true;
}

/**
 * Hide delete account modal
 */
function hideDeleteAccountModal() {
  document.getElementById('delete-account-modal').style.display = 'none';
}

/**
 * Validate delete confirmation input
 */
function validateDeleteConfirmation() {
  const input = document.getElementById('confirm-delete-input');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  
  confirmBtn.disabled = input.value !== 'DELETE';
}

/**
 * Delete account
 */
async function deleteAccount() {
  try {
    const { default: profileService } = await import('./profile-service.js');
    await profileService.deleteAccount();
    
    hideDeleteAccountModal();
    alert('Account deleted successfully!');
    // User will be redirected by the auth state change listener
  } catch (error) {
    console.error('Error deleting account:', error);
    alert('Error deleting account: ' + error.message);
  }
}

/**
 * Toggle auth (login/logout)
 */
async function toggleAuth() {
  try {
    const { default: authService } = await import('./auth-service.js');
    const isAuthenticated = authService.getIsAuthenticated();
    
    if (isAuthenticated) {
      showLogoutConfirmation();
    } else {
      document.getElementById('login-modal').style.display = 'flex';
    }
  } catch (error) {
    console.error('Error toggling auth:', error);
  }
}

/**
 * Populate country dropdown
 */
async function populateCountryDropdown() {
  const countrySelect = document.getElementById('user-country');
  if (!countrySelect) return;

  // Clear existing options except the first one
  countrySelect.innerHTML = '<option value="">Select your country</option>';

  try {
    // Fetch ALL flags from all 4 continents
    const flagFiles = {
      africa: 'dist/flags_africa.json',
      europe: 'dist/flags_europe.json',
      asia: 'dist/flags_asia.json',
      america: 'dist/flags_america.json'
    };

    let allCountries = [];

    // Loop through all continents and collect all countries
    for (const continent in flagFiles) {
      const fileName = flagFiles[continent];

      if (!fileName) continue;

      const response = await fetch(fileName);
      const allFlagsData = await response.json();

      // Extract all countries from all regions in this continent
      for (const regionKey in allFlagsData) {
        allFlagsData[regionKey].forEach(flag => {
          if (!allCountries.includes(flag.country)) {
            allCountries.push(flag.country);
          }
        });
      }
    }

    // Sort countries alphabetically for better UX
    allCountries.sort();

    allCountries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      countrySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating country dropdown:', error);
  }
}