import authService, { supabase } from "./auth-service.js";
import { default as scoreService } from "./score-service.js";

// Check if Supabase is properly initialized
const isSupabaseInitialized = () => {
	return supabase !== null;
};

/**
 * Profile service module for handling user profile and statistics
 */
class ProfileService {
	constructor() {
		this.charts = {};
	}

	/**
	 * Get user profile information
	 */
	async getUserProfile(userId = null) {
		if (!isSupabaseInitialized()) {
			console.warn('Supabase is not initialized. Cannot fetch user profile.');
			return null;
		}

		const userIdToUse = userId || authService.getCurrentUser()?.id;
		if (!userIdToUse) {
			throw new Error("No user ID provided and no authenticated user");
		}

		try {
			const { data, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", userIdToUse)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					// Record not found - user might not have a profile in the users table yet
					return null;
				}
				throw new Error(error.message);
			}

			return data;
		} catch (error) {
			console.error('Error in getUserProfile:', error);
			throw error;
		}
	}

	/**
	 * Update user profile information
	 */
	async updateUserProfile(profileData) {
		if (!isSupabaseInitialized()) {
			console.warn('Supabase is not initialized. Cannot update user profile.');
			return null;
		}

		if (!authService.getCurrentUser()) {
			throw new Error("User not authenticated");
		}

		const user = authService.getCurrentUser();
		const userId = user.id;
		const profile = {
			...profileData,
			updated_at: new Date().toISOString(),
		};

		try {
			// Update the existing profile
			const { data, error } = await supabase
				.from("users")
				.update(profile)
				.eq("id", userId)
				.select()
				.single();

			if (error) {
				// If update fails because the record doesn't exist, try inserting
				if (error.code === 'PGRST116') { // Record not found
					// Insert the profile with the user ID and email
					const insertProfile = {
						id: userId,
						email: user.email || '', // Ensure email is provided
						...profile
					};

					const { data: insertData, error: insertError } = await supabase
						.from("users")
						.insert([insertProfile])
						.select()
						.single();

					if (insertError) {
						throw new Error(insertError.message);
					}

					return insertData;
				} else {
					throw new Error(error.message);
				}
			}

			return data;
		} catch (error) {
			console.error('Error in updateUserProfile:', error);
			throw error;
		}
	}

	/**
	 * Get user's game statistics
	 */
	async getUserStats(userId = null) {
		if (!supabase) {
			throw new Error("Supabase client not initialized");
		}

		const userIdToUse = userId || authService.getCurrentUser()?.id;
		if (!userIdToUse) {
			throw new Error("No user ID provided and no authenticated user");
		}

		// Get all user scores
		const userScores = await scoreService.fetchUserScores(userIdToUse);

		// Calculate statistics
		const stats = {
			totalGames: userScores.length,
			bestMoves: this.getBestMoves(userScores),
			bestTime: this.getBestTime(userScores),
			gamesOverTime: this.calculateGamesOverTime(userScores),
			performanceByDifficulty:
				this.calculatePerformanceByDifficulty(userScores),
			performanceByContinent: this.calculatePerformanceByContinent(userScores),
		};

		return stats;
	}

	/**
	 * Get best moves from user scores
	 */
	getBestMoves(scores) {
		if (scores.length === 0) return "-";

		const bestScore = scores.reduce((best, current) =>
			current.moves < best.moves ? current : best
		);

		return bestScore.moves;
	}

	/**
	 * Get best time from user scores
	 */
	getBestTime(scores) {
		if (scores.length === 0) return "-";

		const bestScore = scores.reduce((best, current) => {
			if (current.moves < best.moves) return current;
			if (current.moves === best.moves) {
				const currentTimeSec = this.timeToSeconds(current.time);
				const bestTimeSec = this.timeToSeconds(best.time);
				return currentTimeSec < bestTimeSec ? current : best;
			}
			return best;
		});

		return bestScore.time;
	}

	/**
	 * Calculate games played over time
	 */
	calculateGamesOverTime(scores) {
		const gamesByDate = {};

		scores.forEach((score) => {
			const date = new Date(score.created_at).toDateString();
			gamesByDate[date] = (gamesByDate[date] || 0) + 1;
		});

		// Convert to arrays for chart
		const dates = Object.keys(gamesByDate).sort();
		const counts = dates.map((date) => gamesByDate[date]);

		return { dates, counts };
	}

	/**
	 * Calculate performance by difficulty
	 */
	calculatePerformanceByDifficulty(scores) {
		const difficultyStats = {
			easy: { avgMoves: 0, avgTime: 0, count: 0 },
			medium: { avgMoves: 0, avgTime: 0, count: 0 },
			hard: { avgMoves: 0, avgTime: 0, count: 0 },
		};

		// Group scores by difficulty
		const grouped = scores.reduce((acc, score) => {
			if (!acc[score.difficulty]) acc[score.difficulty] = [];
			acc[score.difficulty].push(score);
			return acc;
		}, {});

		// Calculate averages for each difficulty
		Object.keys(difficultyStats).forEach((difficulty) => {
			const difficultyScores = grouped[difficulty] || [];
			if (difficultyScores.length > 0) {
				const totalMoves = difficultyScores.reduce(
					(sum, score) => sum + score.moves,
					0
				);
				const totalTime = difficultyScores.reduce(
					(sum, score) => sum + this.timeToSeconds(score.time),
					0
				);

				difficultyStats[difficulty].avgMoves =
					totalMoves / difficultyScores.length;
				difficultyStats[difficulty].avgTime =
					totalTime / difficultyScores.length;
				difficultyStats[difficulty].count = difficultyScores.length;
			}
		});

		return difficultyStats;
	}

	/**
	 * Calculate performance by continent
	 */
	calculatePerformanceByContinent(scores) {
		const continentStats = {};

		// Group scores by continent
		const grouped = scores.reduce((acc, score) => {
			if (!acc[score.continent]) acc[score.continent] = [];
			acc[score.continent].push(score);
			return acc;
		}, {});

		// Calculate averages for each continent
		Object.keys(grouped).forEach((continent) => {
			const continentScores = grouped[continent];
			const totalMoves = continentScores.reduce(
				(sum, score) => sum + score.moves,
				0
			);
			const totalTime = continentScores.reduce(
				(sum, score) => sum + this.timeToSeconds(score.time),
				0
			);

			continentStats[continent] = {
				avgMoves: totalMoves / continentScores.length,
				avgTime: totalTime / continentScores.length,
				count: continentScores.length,
			};
		});

		return continentStats;
	}

	/**
	 * Get user's rankings
	 */
	async getUserRankings(userId = null) {
		if (!supabase) {
			throw new Error("Supabase client not initialized");
		}

		const userIdToUse = userId || authService.getCurrentUser()?.id;
		if (!userIdToUse) {
			throw new Error("No user ID provided and no authenticated user");
		}

		// Get rankings for all continents
		const continents = ["africa", "america", "asia", "europe"];
		const rankings = {
			global: { rank: 0, total: 0 },
			africa: { rank: 0, total: 0 },
			america: { rank: 0, total: 0 },
			asia: { rank: 0, total: 0 },
			europe: { rank: 0, total: 0 },
		};

		// Calculate global ranking
		const globalRanking = await this.calculateGlobalRanking(userIdToUse);
		rankings.global = globalRanking;

		// Calculate continent-specific rankings
		for (const continent of continents) {
			const continentRanking = await scoreService.getUserRanking(
				continent,
				"all"
			);
			rankings[continent] = continentRanking;
		}

		return rankings;
	}

	/**
	 * Calculate global ranking for a user
	 */
	async calculateGlobalRanking(userId) {
		// This is a simplified calculation - in reality, you'd need a more complex query
		// to determine global ranking based on best scores

		// For now, we'll return a default value
		return { rank: 0, total: 0 };
	}

	/**
	 * Convert time string (MM:SS) to seconds for comparison
	 */
	timeToSeconds(timeStr) {
		const [minutes, seconds] = timeStr.split(":").map(Number);
		return minutes * 60 + seconds;
	}

	/**
	 * Delete user account and all associated data
	 */
	async deleteAccount() {
		if (!supabase) {
			throw new Error("Supabase client not initialized");
		}

		if (!authService.getCurrentUser()) {
			throw new Error("User not authenticated");
		}

		const userId = authService.getCurrentUser().id;

		try {
			// Delete user's scores
			const { error: scoresError } = await supabase
				.from("scores")
				.delete()
				.eq("user_id", userId);

			if (scoresError) {
				console.error("Error deleting user scores:", scoresError.message);
				throw new Error(scoresError.message);
			}

			// Delete user profile from the users table
			const { error: profileError } = await supabase
				.from("users")
				.delete()
				.eq("id", userId);

			if (profileError) {
				console.error("Error deleting user profile:", profileError.message);
				throw new Error(profileError.message);
			}

			// Delete user from auth system (this requires service role key, so we'll skip for now)
			// Instead, we'll just sign out the user
			await authService.signOut();

			return { success: true };
		} catch (error) {
			console.error("Error deleting account:", error);
			throw error;
		}
	}
}

// Export singleton instance
const profileService = new ProfileService();
export default profileService;

// Also export for direct instantiation if needed
export { ProfileService };