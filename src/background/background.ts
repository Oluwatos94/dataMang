// Background script for PDM extension
// Handles service worker functionality and extension lifecycle

console.log('PDM Background script loaded');

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('PDM Extension installed/updated:', details.reason);
});

export {};