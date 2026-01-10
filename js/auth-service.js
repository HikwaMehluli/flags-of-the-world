import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Authentication will not work.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Authentication service module for Supabase integration
 */
class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authStateListeners = [];
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  notifyAuthStateChange(user, isAuthenticated) {
    this.authStateListeners.forEach(callback => {
      callback({ user, isAuthenticated });
    });
  }

  /**
   * Check current session on initialization
   */
  async initializeSession() {
    if (!supabase) return null;
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    
    if (session) {
      this.currentUser = session.user;
      this.isAuthenticated = true;
      this.notifyAuthStateChange(this.currentUser, this.isAuthenticated);
    }
    
    // Set up real-time auth state listener
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.currentUser = session.user;
        this.isAuthenticated = true;
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
      }
      this.notifyAuthStateChange(this.currentUser, this.isAuthenticated);
    });

    return session;
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password, options = {}) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: options.fullName || '',
          username: options.username || '',
          ...options.additionalData
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update current user if signup was successful
    if (data?.user) {
      this.currentUser = data.user;
      this.isAuthenticated = !!data.session;
      this.notifyAuthStateChange(this.currentUser, this.isAuthenticated);
    }

    return data;
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.user) {
      this.currentUser = data.user;
      this.isAuthenticated = true;
      this.notifyAuthStateChange(this.currentUser, this.isAuthenticated);
    }

    return data;
  }

  /**
   * Sign in with social provider (Google, GitHub, etc.)
   */
  async signInWithProvider(provider, options = {}) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options.redirectTo || window.location.origin
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error.message);
      throw new Error(error.message);
    }

    this.currentUser = null;
    this.isAuthenticated = false;
    this.notifyAuthStateChange(this.currentUser, this.isAuthenticated);

    return { success: true };
  }

  /**
   * Reset user's password (send reset email)
   */
  async resetPassword(email) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(updates) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update local user object
    this.currentUser = { ...this.currentUser, ...data.user };
    this.notifyAuthStateChange(this.currentUser, this.isAuthenticated);

    return data;
  }

  /**
   * Get current user profile
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  getIsAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Get user's profile information from the database
   */
  async getUserProfile(userId = null) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const userIdToUse = userId || this.currentUser?.id;
    if (!userIdToUse) {
      throw new Error('No user ID provided and no authenticated user');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userIdToUse)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found - user might not have a profile in the users table yet
        return null;
      }
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Create or update user profile in the database
   */
  async upsertUserProfile(profileData) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const profile = {
      id: this.currentUser.id,
      email: this.currentUser.email,
      ...profileData
    };

    const { data, error } = await supabase
      .from('users')
      .upsert([profile], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Delete user account
   */
  async deleteAccount() {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    // First, delete user's scores
    await this.deleteUserScores();

    // Then delete user profile from the users table
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', this.currentUser.id);

    if (profileError) {
      console.error('Error deleting user profile:', profileError.message);
      // Don't throw here as we still want to try to delete the auth account
    }

    // Finally, delete the auth account (requires service role key, so this might not work from client)
    // Instead, we'll just sign out the user
    await this.signOut();

    return { success: true };
  }

  /**
   * Delete user's scores
   */
  async deleteUserScores() {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('user_id', this.currentUser.id);

    if (error) {
      console.error('Error deleting user scores:', error.message);
      throw new Error(error.message);
    }

    return { success: true };
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;

// Also export for direct instantiation if needed
export { AuthService, supabase };