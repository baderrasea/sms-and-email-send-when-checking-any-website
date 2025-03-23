const { firefox } = require('@playwright/test');
const nodemailer = require('nodemailer');

// Configuration
const url='https://qafelh.com/'
const wordToFind = 'قفلة '; // Adjust as needed (e.g., "student visa")
let lastStatus = null; // Possible values: 'found' or 'not_found'

// Configure your email transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'badraldeenrasea@gmail.com',      // Replace with your email address
    pass: 'lenp ozew pevq cmey',         // Replace with your email password or app-specific password
  },
});

// Function to send email notifications
function sendEmail(subject, message) {
  const mailOptions = {
    from: 'baderrasaa8@gmail.com',             // Sender address
    to: 'baderrasaa8@gmail.com',        // Recipient address (can be the same as sender)
    subject: subject,
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

// Function to check the website for the word
async function checkWebsite() {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the URL with an increased timeout (30 seconds)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const content = await page.content();

    // Check if the specified word exists in the page content
    if (content.includes(wordToFind)) {
      console.log(`Found the word "${wordToFind}" at ${new Date().toLocaleString()}.`);
      // If the status has changed, send an alert email
      if (lastStatus !== 'found') {
        sendEmail(
          'Word Found Alert',
          `The word "${wordToFind}" was found on the website at ${new Date().toLocaleString()}.`
        );
        lastStatus = 'found';
      }
    } else {
      console.log(`Word "${wordToFind}" not found at ${new Date().toLocaleString()}.`);
      // If the status has changed, send a "not found" email
      if (lastStatus !== 'not_found') {
        sendEmail(
          'Word Not Found Alert',
          `The word "${wordToFind}" is not found on the website at ${new Date().toLocaleString()}. The website is live again.`
        );
        lastStatus = 'not_found';
      }
    }
  } catch (error) {
    console.error('Error loading the page:', error.message);
  }

  await browser.close();
}

// Immediately check the website on startup
checkWebsite();

// Then schedule the check every 30 second 
setInterval(checkWebsite, 30 *  1000);
