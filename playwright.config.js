// playwright.config.js
module.exports = {
    // Ensure browsers are installed
    projects: [
      {
        name: 'chromium',
        use: {
          browserName: 'chromium',
        },
      },
      {
        name: 'firefox',
        use: {
          browserName: 'firefox',
        },
      },
    ],
  };
