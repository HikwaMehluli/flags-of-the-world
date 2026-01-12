/**
 * User profile component for displaying user information
 */
class UserProfile {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
  }

  /**
   * Initialize the user profile component
   */
  async initialize() {
    try {
      const { default: authService } = await import('./auth-service.js');
      
      // Initialize auth state
      await authService.initializeSession();
      
      // Set up auth state listener
      authService.onAuthStateChange(({ user, isAuthenticated }) => {
        this.user = user;
        this.isAuthenticated = isAuthenticated;
        this.updateProfileDisplay();
      });
      
      // Get initial state
      this.user = authService.getCurrentUser();
      this.isAuthenticated = authService.getIsAuthenticated();
      
      // Update display
      this.updateProfileDisplay();
    } catch (error) {
      console.error('Error initializing user profile component:', error);
    }
  }

  /**
   * Update the profile display based on auth state
   */
  updateProfileDisplay() {
    // Update header auth indicator
    this.updateHeaderAuthIndicator();
    
    // Update any other profile-related UI elements
    this.updateProfileElements();
  }

  /**
   * Update the header auth indicator
   */
  updateHeaderAuthIndicator() {
    const authIndicator = document.getElementById('auth-indicator');
    const authToggleBtn = document.getElementById('auth-toggle-btn');

    if (authIndicator && authToggleBtn) {
      if (this.isAuthenticated && this.user) {
        const displayName = this.user.user_metadata?.full_name ||
                           this.user.user_metadata?.username ||
                           this.user.email?.split('@')[0] ||
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
   * Update other profile-related UI elements
   */
  updateProfileElements() {
    // Update any other elements that depend on user profile
    const profileElements = document.querySelectorAll('[data-profile-field]');
    
    profileElements.forEach(element => {
      const field = element.getAttribute('data-profile-field');
      
      if (this.isAuthenticated && this.user) {
        let value = '';
        
        switch (field) {
          case 'email':
            value = this.user.email || '';
            break;
          case 'full_name':
            value = this.user.user_metadata?.full_name || this.user.email?.split('@')[0] || '';
            break;
          case 'username':
            value = this.user.user_metadata?.username || this.user.email?.split('@')[0] || '';
            break;
          default:
            value = this.user[field] || this.user.user_metadata?.[field] || '';
        }
        
        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'select') {
          element.value = value;
        } else {
          element.textContent = value;
        }
      } else {
        // Clear or set default values when not authenticated
        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'select') {
          element.value = '';
        } else {
          element.textContent = element.getAttribute('data-default-value') || '';
        }
      }
    });
  }

  /**
   * Get the current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  getIsAuthenticated() {
    return this.isAuthenticated;
  }
}

// Initialize the user profile component when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Only initialize if we're on a page that has profile elements
  if (document.getElementById('auth-indicator') || document.querySelector('[data-profile-field]')) {
    const userProfile = new UserProfile();
    await userProfile.initialize();
    
    // Make it globally available if needed
    window.userProfileComponent = userProfile;
  }
});

// Export the class for potential use in other modules
export default UserProfile;