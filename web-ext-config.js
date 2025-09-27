// Configuration for web-ext (Firefox extension testing)
module.exports = {
  // Global options
  verbose: true,

  // web-ext build options
  build: {
    overwriteDest: true,
  },

  // web-ext run options
  run: {
    firefox: 'firefox-developer-edition', // or 'firefox'
    startUrl: ['about:debugging#/runtime/this-firefox'],
    pref: {
      // Disable extension signing requirement for development
      'xpinstall.signatures.required': false,
      // Enable devtools
      'devtools.debugger.remote-enabled': true,
      'devtools.chrome.enabled': true,
      'devtools.debugger.prompt-connection': false,
    },
    // Keep the browser open after web-ext exits
    keepProfileChanges: true,
  },

  // web-ext lint options
  lint: {
    pretty: true,
    warningsAsErrors: false,
  },

  // Source directory
  sourceDir: './dist',

  // Artifacts directory
  artifactsDir: './web-ext-artifacts',

  // Files to ignore
  ignoreFiles: [
    '*.md',
    '*.txt',
    'docs/',
    'tests/',
    '*.map',
  ],
};