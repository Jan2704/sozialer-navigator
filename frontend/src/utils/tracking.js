// utils/tracking.js
export const trackEvent = (eventName, properties = {}) => {
  if (typeof window !== 'undefined') {
    console.log(`📊 [TRACKING] ${eventName}`, properties);
  }
};