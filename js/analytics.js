/**
 * Google Analytics utility module
 * This module handles Google Analytics tracking based on environment variables
 */

// Import the Google Analytics Measurement ID from environment variables
const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || '';

// Define gtag function globally to make it available for export
function gtag(...args) {
    window.dataLayer = window.dataLayer || [];

    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== '') {
        // If GA is configured, push to dataLayer
        window.dataLayer.push(args);

        // console.debug('This app uses Google Analytics');
    } else {
        // If no GA is configured, log debug info
        console.debug('Google Analytics not configured. gtag called with:', args);
    }
}

// Export gtag function for use in other modules
export { gtag };

// Only initialize Google Analytics if the measurement ID is provided
if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== '') {
    // Load Google Analytics script dynamically
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;

    // Configure Google Analytics
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
} else {
    // If no GA_MEASUREMENT_ID is provided, assign the mock function
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
}