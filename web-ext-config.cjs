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
    firefox: 'firefox', // or 'firefox-developer-edition'
    startUrl: ['about:debugging#/runtime/this-firefox'],
    pref: {
      // Disable extension signing requirement for development (camelCase format)
      xpinstallSignaturesRequired: false,
      devtoolsDebuggerRemoteEnabled: true,
      devtoolsChromeEnabled: true,
      devtoolsDebuggerPromptConnection: false,
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