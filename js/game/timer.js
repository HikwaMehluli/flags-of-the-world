import { secondsToTime } from '../utils/time-utils.js';

/**
 * Timer - Precise game timer with pause/resume support
 *
 * Handles game timing with precise elapsed time tracking
 * Uses performance.now() for monotonic timing (not affected by system clock changes)
 * Emits events for time updates
 *
 * @class Timer
 */
class Timer {
  constructor(options = {}) {
    this.startTime = null;
    this.elapsedTime = 0;
    this.pausedTime = null;
    this.performanceStart = null; // For monotonic timing
    this.intervalId = null;
    this.isRunning = false;
    this.isPaused = false;

    this.onTick = options.onTick || (() => {});
    this.onStop = options.onStop || (() => {});

    this.listeners = [];
  }

  /**
   * Start timer
   *
   * @returns {Timer} This timer instance
   */
  start() {
    if (this.isRunning) {
      console.warn('Timer already running');
      return this;
    }

    // Use performance.now() for monotonic timing (not affected by system clock changes)
    this.performanceStart = performance.now();
    this.isRunning = true;
    this.isPaused = false;

    this.intervalId = setInterval(() => {
      const elapsed = this.getElapsed();
      this.onTick(elapsed);
      this.notifyListeners(elapsed);
    }, 1000);

    console.log('Timer started');
    return this;
  }

  /**
   * Stop timer
   *
   * @returns {Timer} This timer instance
   */
  stop() {
    if (!this.isRunning) {
      return this;
    }

    // Save elapsed time before stopping
    this.elapsedTime = this.getElapsed();
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.performanceStart = null;

    this.onStop(this.elapsedTime);
    console.log('Timer stopped');

    return this;
  }

  /**
   * Pause timer
   *
   * @returns {Timer} This timer instance
   */
  pause() {
    // Strong guards to prevent multiple pause calls corrupting timing
    if (!this.isRunning) {
      console.warn('Timer not running, cannot pause');
      return this;
    }
    if (this.isPaused) {
      console.warn('Timer already paused');
      return this;
    }

    // Calculate and save elapsed time before pausing
    this.elapsedTime = this.getElapsed();
    this.pausedTime = performance.now();
    this.isPaused = true;

    clearInterval(this.intervalId);
    this.intervalId = null;

    console.log('Timer paused. Elapsed:', this.elapsedTime);
    return this;
  }

  /**
   * Resume timer
   *
   * @returns {Timer} This timer instance
   */
  resume() {
    if (!this.isPaused) {
      console.warn('Timer not paused, cannot resume');
      return this;
    }

    // Adjust performance start to account for pause duration
    const pauseDuration = performance.now() - this.pausedTime;
    this.performanceStart = performance.now() - (this.elapsedTime * 1000) + pauseDuration;
    this.pausedTime = null;
    this.isPaused = false;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      const elapsed = this.getElapsed();
      this.onTick(elapsed);
      this.notifyListeners(elapsed);
    }, 1000);

    console.log('Timer resumed');
    return this;
  }

  /**
   * Reset timer
   *
   * @returns {Timer} This timer instance
   */
  reset() {
    this.stop();
    this.elapsedTime = 0;
    this.startTime = null;
    this.pausedTime = null;
    this.performanceStart = null;
    this.isRunning = false;
    this.isPaused = false;

    this.onTick(0);
    this.notifyListeners(0);

    console.log('Timer reset');
    return this;
  }

  /**
   * Get elapsed time in seconds
   * Uses performance.now() for monotonic timing
   *
   * @returns {number} Elapsed time in seconds
   */
  getElapsed() {
    if (!this.isRunning) {
      return this.elapsedTime;
    }

    if (this.isPaused) {
      return this.elapsedTime;
    }

    // Use performance.now() for accurate timing unaffected by system clock changes
    const performanceElapsed = (performance.now() - this.performanceStart) / 1000;
    return Math.floor(performanceElapsed);
  }

  /**
   * Get elapsed time formatted as MM:SS
   * Uses utility function for DRY code
   *
   * @returns {string} Formatted time
   */
  getElapsedFormatted() {
    return secondsToTime(this.getElapsed());
  }

  /**
   * Subscribe to time updates
   *
   * @param {Function} listener - Listener function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of time update
   *
   * @private
   * @param {number} elapsed - Elapsed time in seconds
   */
  notifyListeners(elapsed) {
    this.listeners.forEach(listener => {
      try {
        listener(elapsed);
      } catch (error) {
        console.error('Error in timer listener:', error);
      }
    });
  }

  /**
   * Get timer state
   *
   * @returns {Object} Timer state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      elapsed: this.getElapsed(),
      elapsedFormatted: this.getElapsedFormatted()
    };
  }

  /**
   * Destroy timer and cleanup
   *
   * @returns {void}
   */
  destroy() {
    this.stop();
    this.listeners = [];
    console.log('Timer destroyed');
  }
}

export default Timer;
export { Timer };
