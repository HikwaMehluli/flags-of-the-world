/**
 * Authentication modal component for login/signup functionality
 */
class AuthModal {
	constructor() {
		this.loginForm = document.getElementById('login-form');
		this.signupForm = document.getElementById('signup-form');

		// Modals
		this.loginModal = document.getElementById('login-modal');
		this.signupModal = document.getElementById('signup-modal');
		this.logoutModal = document.getElementById('logout-modal');

		this.authToggleBtn = document.getElementById('auth-toggle-btn');
		this.confirmLogoutBtn = document.getElementById('confirm-logout');
		this.cancelLogoutBtn = document.getElementById('cancel-logout');

		// Social login buttons
		this.googleLoginBtn = document.getElementById('google-login');
		this.githubLoginBtn = document.getElementById('github-login');

		// Forgot password link
		this.forgotPasswordLink = document.getElementById('forgot-password-link');
		this.switchToSignupLink = document.getElementById('switch-to-signup');
		this.switchToLoginLink = document.getElementById('switch-to-login');

		// Initialize the modal
		this.init();
	}

	/**
	 * Initialize the authentication modal
	 */
	init() {
		if (!this.loginModal) return;

		// Set up form submissions
		this.setupFormSubmissions();

		// Set up social login buttons
		this.setupSocialLogin();

		// Set up forgot password
		this.setupForgotPassword();

		// Set up switch links
		this.setupSwitchLinks();

		// Set up auth toggle button
		this.setupAuthToggle();

		// Set up logout functionality
		this.setupLogout();

		// Set up close buttons
		this.setupCloseButtons();
	}

	/**
	 * Set up switch links between login and signup forms
	 */
	setupSwitchLinks() {
		if (this.switchToSignupLink) {
			this.switchToSignupLink.addEventListener('click', (e) => {
				e.preventDefault();
				this.openSignupModal();
			});
		}

		if (this.switchToLoginLink) {
			this.switchToLoginLink.addEventListener('click', (e) => {
				e.preventDefault();
				this.openLoginModal();
			});
		}
	}

	/**
	 * Open login modal and close signup modal
	 */
	openLoginModal() {
		this.closeModal(); // Close any open modals
		if (this.loginModal) {
			this.loginModal.style.display = 'flex';
		}
	}

	/**
	 * Open signup modal and close login modal
	 */
	openSignupModal() {
		this.closeModal(); // Close any open modals
		if (this.signupModal) {
			this.signupModal.style.display = 'flex';
		}
	}

	/**
	 * Set up form submissions
	 */
	setupFormSubmissions() {
		// Login form submission
		if (this.loginForm) {
			this.loginForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				await this.handleLogin();
			});
		}

		// Signup form submission
		if (this.signupForm) {
			this.signupForm.addEventListener('submit', async (e) => {
				e.preventDefault();
				await this.handleSignup();
			});
		}
	}

	/**
	 * Handle login form submission
	 */
	async handleLogin() {
		if (!this.loginForm) return;

		const email = document.getElementById('login-email').value.trim();
		const password = document.getElementById('login-password').value;

		if (!email || !password) {
			this.showMessage('Please fill in all fields', 'error');
			return;
		}

		try {
			const { default: authService } = await import('../auth-service.js');

			const result = await authService.signIn(email, password);

			if (result) {
				this.showMessage('Login successful!', 'success');

				// Close the modal
				this.closeModal();

				// Update UI elements that depend on auth state
				this.updateAuthUI(authService.getCurrentUser(), true);
			}
		} catch (error) {
			console.error('Login error:', error);
			this.showMessage(error.message || 'Login failed. Please try again.', 'error');
		}
	}

	/**
	 * Handle signup form submission
	 */
	async handleSignup() {
		if (!this.signupForm) return;

		const fullName = document.getElementById('signup-fullname').value.trim();
		const username = document.getElementById('signup-username').value.trim();
		const email = document.getElementById('signup-email').value.trim();
		const password = document.getElementById('signup-password').value;
		const confirmPassword = document.getElementById('signup-confirm-password').value;

		// Validation
		if (!fullName || !username || !email || !password || !confirmPassword) {
			this.showMessage('Please fill in all fields', 'error');
			return;
		}

		if (password !== confirmPassword) {
			this.showMessage('Passwords do not match', 'error');
			return;
		}

		if (password.length < 6) {
			this.showMessage('Password must be at least 6 characters', 'error');
			return;
		}

		try {
			const { default: authService } = await import('../auth-service.js');

			const result = await authService.signUp(email, password, {
				fullName,
				username
			});

			if (result) {
				this.showMessage('Account created successfully! Please check your email to confirm your account.', 'success');

				// Switch to login modal after successful signup
				setTimeout(() => {
					this.openLoginModal();
				}, 2000);
			}
		} catch (error) {
			console.error('Signup error:', error);
			this.showMessage(error.message || 'Signup failed. Please try again.', 'error');
		}
	}

	/**
	 * Set up social login buttons
	 */
	setupSocialLogin() {
		if (this.googleLoginBtn) {
			this.googleLoginBtn.addEventListener('click', async () => {
				try {
					const { default: authService } = await import('../auth-service.js');
					await authService.signInWithProvider('google');
				} catch (error) {
					console.error('Google login error:', error);
					this.showMessage(error.message || 'Google login failed. Please try again.', 'error');
				}
			});
		}

		if (this.githubLoginBtn) {
			this.githubLoginBtn.addEventListener('click', async () => {
				try {
					const { default: authService } = await import('../auth-service.js');
					await authService.signInWithProvider('github');
				} catch (error) {
					console.error('GitHub login error:', error);
					this.showMessage(error.message || 'GitHub login failed. Please try again.', 'error');
				}
			});
		}
	}

	/**
	 * Set up forgot password functionality
	 */
	setupForgotPassword() {
		if (this.forgotPasswordLink) {
			this.forgotPasswordLink.addEventListener('click', async (e) => {
				e.preventDefault();

				const email = prompt('Please enter your email address:');
				if (!email) return;

				try {
					const { default: authService } = await import('../auth-service.js');
					await authService.resetPassword(email);

					this.showMessage('Password reset email sent! Please check your inbox.', 'success');
				} catch (error) {
					console.error('Password reset error:', error);
					this.showMessage(error.message || 'Failed to send password reset email. Please try again.', 'error');
				}
			});
		}
	}

	/**
	 * Set up auth toggle button (the Login/Logout button in header)
	 */
	setupAuthToggle() {
		if (this.authToggleBtn) {
			this.authToggleBtn.addEventListener('click', async () => {
				const { default: authService } = await import('../auth-service.js');
				const isAuthenticated = authService.getIsAuthenticated();

				if (isAuthenticated) {
					// Show logout confirmation modal
					if (this.logoutModal) {
						this.logoutModal.style.display = 'flex';
					}
				} else {
					// Show login modal
					this.openModal();
				}
			});
		}
	}

	/**
	 * Set up logout functionality
	 */
	setupLogout() {
		if (this.confirmLogoutBtn) {
			this.confirmLogoutBtn.addEventListener('click', async () => {
				await this.handleLogout();
			});
		}

		if (this.cancelLogoutBtn) {
			this.cancelLogoutBtn.addEventListener('click', () => {
				if (this.logoutModal) {
					this.logoutModal.style.display = 'none';
				}
			});
		}
	}

	/**
	 * Handle logout action
	 */
	async handleLogout() {
		try {
			const { default: authService } = await import('../auth-service.js');
			const result = await authService.signOut();

			if (result && result.success) {
				// Close modal
				if (this.logoutModal) {
					this.logoutModal.style.display = 'none';
				}

				this.showMessage('Logged out successfully', 'success');

				// Update UI
				this.updateAuthUI(null, false);
			}
		} catch (error) {
			console.error('Logout error:', error);
			this.showMessage('Logout failed. Please try again.', 'error');
		}
	}

	/**
	 * Set up close buttons
	 */
	setupCloseButtons() {
		// Close modal buttons
		const closeButtons = document.querySelectorAll('.close-modal');
		closeButtons.forEach(button => {
			button.addEventListener('click', () => {
				this.closeModal();
			});
		});

		// Close modal when clicking outside content
		window.addEventListener('click', (e) => {
			if (this.loginModal && e.target === this.loginModal) {
				this.closeModal();
			}
			if (this.signupModal && e.target === this.signupModal) {
				this.closeModal();
			}
			if (this.logoutModal && e.target === this.logoutModal) {
				this.logoutModal.style.display = 'none';
			}
		});
	}

	/**
	 * Open the login modal (default)
	 */
	openModal() {
		this.openLoginModal();
	}

	/**
	 * Close all auth modals
	 */
	closeModal() {
		if (this.loginModal) {
			this.loginModal.style.display = 'none';
		}
		if (this.signupModal) {
			this.signupModal.style.display = 'none';
		}

		// Clear form fields
		if (this.loginForm) {
			this.loginForm.reset();
		}
		if (this.signupForm) {
			this.signupForm.reset();
		}
	}

	/**
	 * Show a message to the user
	 */
	showMessage(message, type) {
		// Create a temporary message element
		const messageEl = document.createElement('div');
		messageEl.className = `auth-message auth-message-${type}`;
		messageEl.textContent = message;
		messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      ${type === 'error' ? 'background-color: #f44336;' : 'background-color: #4CAF50;'}
    `;

		document.body.appendChild(messageEl);

		// Remove the message after 3 seconds
		setTimeout(() => {
			if (document.body.contains(messageEl)) {
				document.body.removeChild(messageEl);
			}
		}, 3000);
	}

	/**
	 * Update authentication UI elements
	 */
	updateAuthUI(user, isAuthenticated) {
		const authIndicator = document.getElementById('auth-indicator');
		const authToggleBtn = document.getElementById('auth-toggle-btn');

		if (authIndicator && authToggleBtn) {
			if (isAuthenticated && user) {
				const displayName = user.user_metadata?.full_name ||
					user.user_metadata?.username ||
					user.email?.split('@')[0] ||
					'User';
				authIndicator.textContent = displayName;
				authToggleBtn.textContent = 'Logout';
			} else {
				authIndicator.textContent = 'Guest';
				authToggleBtn.textContent = 'Login';
			}
		}
	}
}

// Initialize the auth modal when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	// Only initialize if we're on a page that has the auth modal
	if (document.getElementById('login-modal')) {
		new AuthModal();
	}
});

// Export the class for potential use in other modules
export default AuthModal;