const { firefox } = require('@playwright/test');

(async () => {
  // Launch Firefox in headless mode
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://service2.diplo.de/rktermin/extern/appointment_showMonth.do?locationCode=mask&realmId=354&categoryId=1638&dateStr=09.02.2025';
  try {
    // Increase the timeout if needed
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const content = await page.content();
    const wordToFind = 'tudent visa'; // Adjust this based on what you're looking for

    if (content.includes(wordToFind)) {
      console.log(`Found the word "${wordToFind}"!`);
      // Here, add your email sending logic if needed.
    } else {
      console.log(`Word "${wordToFind}" not found.`);
    }
  } catch (error) {
    console.error('Error loading the page:', error.message);
  }
  await browser.close();
})();
