/**
 * Timer - Game timer with start/stop/pause/resume
 *
 * Uses performance.now() for monotonic timing unaffected by system clock changes.
 * Emits elapsed seconds via onTick callback every 1s.
 */
class Timer {
	/**
	 * @param {Object} [options]
	 * @param {Function} [options.onTick] - Called every second with elapsed time
	 * @param {Function} [options.onStop] - Called once when timer stops
	 */
	constructor(options = {}) {
		this.elapsedTime = 0;
		this.pausedTime = null;
		this.performanceStart = null;
		this.intervalId = null;
		this.isRunning = false;
		this.isPaused = false;

		this.onTick = options.onTick || (() => {});
		this.onStop = options.onStop || (() => {});
	}

	/**
	 * Start the timer. No-op if already running.
	 * @returns {Timer}
	 */
	start() {
		if (this.isRunning) return this;

		this.performanceStart = performance.now();
		this.isRunning = true;
		this.isPaused = false;

		this.intervalId = setInterval(() => {
			this.onTick(this.getElapsed());
		}, 1000);

		return this;
	}

	/**
	 * Stop the timer and fire onStop. No-op if not running.
	 * @returns {Timer}
	 */
	stop() {
		if (!this.isRunning) return this;

		this.elapsedTime = this.getElapsed();
		clearInterval(this.intervalId);
		this.intervalId = null;
		this.isRunning = false;
		this.isPaused = false;
		this.performanceStart = null;

		this.onStop(this.elapsedTime);
		return this;
	}

	/**
	 * Pause the timer, saving elapsed time. No-op if not running or already paused.
	 * @returns {Timer}
	 */
	pause() {
		if (!this.isRunning || this.isPaused) return this;

		this.elapsedTime = this.getElapsed();
		this.pausedTime = performance.now();
		this.isPaused = true;

		clearInterval(this.intervalId);
		this.intervalId = null;

		return this;
	}

	/**
	 * Resume a paused timer, adjusting for pause duration. No-op if not paused.
	 * @returns {Timer}
	 */
	resume() {
		if (!this.isPaused) return this;

		const pauseDuration = performance.now() - this.pausedTime;
		this.performanceStart = performance.now() - (this.elapsedTime * 1000) + pauseDuration;
		this.pausedTime = null;
		this.isPaused = false;
		this.isRunning = true;

		this.intervalId = setInterval(() => {
			this.onTick(this.getElapsed());
		}, 1000);

		return this;
	}

	/**
	 * Reset timer to zero. Stops if running, fires onTick(0).
	 * @returns {Timer}
	 */
	reset() {
		this.stop();
		this.elapsedTime = 0;
		this.pausedTime = null;
		this.performanceStart = null;
		this.isRunning = false;
		this.isPaused = false;

		this.onTick(0);
		return this;
	}

	/**
	 * Get elapsed time in seconds.
	 * When running, calculates from performance.now(); otherwise returns saved elapsedTime.
	 * @returns {number}
	 */
	getElapsed() {
		if (!this.isRunning || this.isPaused) {
			return this.elapsedTime;
		}

		return Math.floor((performance.now() - this.performanceStart) / 1000);
	}
}

export default Timer;
export { Timer };
