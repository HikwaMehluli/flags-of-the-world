/**
 * Time utility functions for converting and formatting time values
 * @module utils/time-utils
 */

/**
 * Convert time string (MM:SS) to seconds
 * @param {string} timeStr - Time string in "MM:SS" format
 * @returns {number} Total seconds
 *
 * @example
 * timeToSeconds("02:30") // returns 150
 * timeToSeconds("00:45") // returns 45
 */
export function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    console.warn('Invalid time string:', timeStr);
    return 0;
  }

  const [minutes, seconds] = timeStr.split(':').map(Number);

  if (isNaN(minutes) || isNaN(seconds)) {
    console.warn('Invalid time format:', timeStr);
    return 0;
  }

  return minutes * 60 + seconds;
}

/**
 * Convert seconds to time string (MM:SS)
 * @param {number} seconds - Total seconds
 * @returns {string} Time string in "MM:SS" format
 *
 * @example
 * secondsToTime(150) // returns "02:30"
 * secondsToTime(45)  // returns "00:45"
 */
export function secondsToTime(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) {
    console.warn('Invalid seconds value:', seconds);
    return '00:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format elapsed time with leading zeros
 * @param {number} elapsedMs - Elapsed time in milliseconds
 * @returns {string} Formatted time string in "MM:SS" format
 */
export function formatElapsedTime(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  return secondsToTime(totalSeconds);
}

/**
 * Compare two time strings
 * @param {string} time1 - First time string
 * @param {string} time2 - Second time string
 * @returns {number} Negative if time1 < time2, 0 if equal, positive if time1 > time2
 */
export function compareTimes(time1, time2) {
  return timeToSeconds(time1) - timeToSeconds(time2);
}
