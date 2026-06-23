/**
 * Convert "MM:SS" string to total seconds
 * @param {string} timeStr - Time in "MM:SS" format
 * @returns {number} Total seconds
 * @example timeToSeconds("02:30") // 150
 */
export function timeToSeconds(timeStr) {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return minutes * 60 + seconds;
}

/**
 * Convert total seconds to "MM:SS" string
 * @param {number} seconds - Total seconds
 * @returns {string} Time in "MM:SS" format
 * @example secondsToTime(150) // "02:30"
 */
export function secondsToTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
