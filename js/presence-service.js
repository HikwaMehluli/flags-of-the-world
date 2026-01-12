import authService, { supabase } from './auth-service.js';

/**
 * Presence service module for tracking online users in real-time
 */
class PresenceService {
	constructor() {
		this.channel = null;
		this.onlineUsersCount = 0;
		this.presenceRecords = {};
		this.isInitialized = false;
		this.heartbeatInterval = null;
		this.sessionId = this.generateSessionId();
	}

	/**
	 * Generate a unique session ID for this browser session
	 */
	generateSessionId() {
		return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	}

	/**
	 * Initialize presence tracking
	 */
	async initialize() {
		if (this.isInitialized) return;

		try {
			// Subscribe to presence updates
			this.channel = supabase.channel('online-users');

			this.channel
				.on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
						table: 'presence',
					},
					(payload) => {
						this.handlePresenceUpdate(payload);
					}
				)
				.subscribe();

			// Start heartbeat to maintain presence
			this.startHeartbeat();

			// Update presence when auth state changes
			const { default: authService } = await import('./auth-service.js');
			authService.onAuthStateChange(({ user, isAuthenticated }) => {
				if (isAuthenticated && user) {
					this.setPresence(true);
				} else {
					this.setPresence(false);
				}
			});

			this.isInitialized = true;
			console.log('Presence service initialized');
		} catch (error) {
			console.error('Error initializing presence service:', error);
		}
	}

	/**
	 * Handle presence update from real-time subscription
	 */
	handlePresenceUpdate(payload) {
		const { eventType, new: newRecord, old: oldRecord } = payload;

		switch (eventType) {
			case 'INSERT':
				this.presenceRecords[newRecord.id] = newRecord;
				break;
			case 'UPDATE':
				if (newRecord.is_online) {
					this.presenceRecords[newRecord.id] = newRecord;
				} else {
					delete this.presenceRecords[newRecord.id];
				}
				break;
			case 'DELETE':
				delete this.presenceRecords[oldRecord.id];
				break;
		}

		// Update online users count
		this.onlineUsersCount = Object.keys(this.presenceRecords).length;

		// Notify UI of count change
		this.notifyOnlineUsersCountChange(this.onlineUsersCount);
	}

	/**
	 * Set user presence (online/offline)
	 */
	async setPresence(isOnline) {
		if (!supabase) {
			console.error('Supabase client not available');
			return;
		}

		const { default: authService } = await import('./auth-service.js');
		const user = authService.getCurrentUser();

		if (!user && isOnline) {
			console.warn('Cannot set presence online: user not authenticated');
			return;
		}

		const presenceData = {
			user_id: user?.id,
			session_id: this.sessionId,
			last_seen: new Date().toISOString(),
			is_online: isOnline
		};

		try {
			if (isOnline) {
				// Insert or update presence record
				const { error } = await supabase
					.from('presence')
					.upsert([presenceData], {
						onConflict: 'session_id',
						ignoreDuplicates: false
					});

				if (error) {
					console.error('Error setting presence:', error.message);
				}
			} else {
				// Remove presence record when going offline
				const { error } = await supabase
					.from('presence')
					.delete()
					.eq('session_id', this.sessionId);

				if (error) {
					console.error('Error removing presence:', error.message);
				}
			}
		} catch (error) {
			console.error('Error in setPresence:', error);
		}
	}

	/**
	 * Start heartbeat to maintain presence
	 */
	startHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.heartbeatInterval = setInterval(async () => {
			const { default: authService } = await import('./auth-service.js');
			const isAuthenticated = authService.getIsAuthenticated();

			if (isAuthenticated) {
				// Update last seen timestamp
				await this.setPresence(true);
			}
		}, 30000); // Update every 30 seconds
	}

	/**
	 * Stop heartbeat
	 */
	stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	/**
	 * Get current online users count
	 */
	getOnlineUsersCount() {
		return this.onlineUsersCount;
	}

	/**
	 * Notify UI of online users count change
	 */
	notifyOnlineUsersCountChange(count) {
		// Dispatch custom event for UI to listen to
		const event = new CustomEvent('onlineUsersCountChanged', {
			detail: { count }
		});
		document.dispatchEvent(event);
	}

	/**
	 * Cleanup resources
	 */
	async cleanup() {
		// Set presence to offline
		await this.setPresence(false);

		// Stop heartbeat
		this.stopHeartbeat();

		// Unsubscribe from channel
		if (this.channel) {
			await supabase.removeChannel(this.channel);
		}

		this.isInitialized = false;
	}
}

// Export singleton instance
const presenceService = new PresenceService();
export default presenceService;

// Also export for direct instantiation if needed
export { PresenceService };