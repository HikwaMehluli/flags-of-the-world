/**
 * Online users indicator component for displaying real-time user activity
 */
class OnlineUsersIndicator {
  constructor() {
    this.onlineUsersCountElement = document.getElementById('online-users-count');
    this.pulsingCircle = document.querySelector('.pulsing-circle');
    this.currentCount = 0;
    this.isVisible = true;
  }

  /**
   * Initialize the online users indicator
   */
  async initialize() {
    try {
      // Set up event listener for online users count changes
      document.addEventListener('onlineUsersCountChanged', (event) => {
        this.updateOnlineUsersCount(event.detail.count);
      });

      // Initialize with a default count if no event is received
      if (this.onlineUsersCountElement) {
        this.onlineUsersCountElement.textContent = this.currentCount;
      }
    } catch (error) {
      console.error('Error initializing online users indicator:', error);
    }
  }

  /**
   * Update the online users count display
   */
  updateOnlineUsersCount(count) {
    this.currentCount = count || 0;
    
    if (this.onlineUsersCountElement) {
      this.onlineUsersCountElement.textContent = this.currentCount;
    }
    
    // Update visibility and animation based on count
    this.updateVisibility();
  }

  /**
   * Update the visibility and animation of the indicator
   */
  updateVisibility() {
    if (this.pulsingCircle) {
      if (this.currentCount > 0) {
        this.pulsingCircle.style.backgroundColor = '#4CAF50'; // Green for active
        this.pulsingCircle.style.animation = 'pulse 2s infinite';
        this.isVisible = true;
      } else {
        this.pulsingCircle.style.backgroundColor = '#ccc'; // Gray for inactive
        this.pulsingCircle.style.animation = 'none';
        this.isVisible = false;
      }
    }
  }

  /**
   * Get the current online users count
   */
  getCurrentCount() {
    return this.currentCount;
  }

  /**
   * Show or hide the indicator
   */
  setVisible(visible) {
    this.isVisible = visible;
    
    if (this.onlineUsersCountElement) {
      this.onlineUsersCountElement.style.display = visible ? 'inline' : 'none';
    }
    
    if (this.pulsingCircle) {
      this.pulsingCircle.style.display = visible ? 'inline-block' : 'none';
    }
  }
}

// Initialize the online users indicator when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Only initialize if we're on a page that has the online users indicator
  if (document.getElementById('online-users-count') || document.querySelector('.pulsing-circle')) {
    const onlineUsersIndicator = new OnlineUsersIndicator();
    await onlineUsersIndicator.initialize();
    
    // Make it globally available if needed
    window.onlineUsersIndicator = onlineUsersIndicator;
  }
});

// Export the class for potential use in other modules
export default OnlineUsersIndicator;