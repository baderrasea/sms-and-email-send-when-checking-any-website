const express = require('express');
const bodyParser = require('body-parser');
const { firefox } = require('@playwright/test');
const nodemailer = require('nodemailer');

// --- Monitor Configuration ---

// URL to monitor
const url = 'https://qafelh.com/';
// Use a variable so that it can be updated via the web interface.
let wordToFind = 'قفلة '; // Default search word/phrase
let lastStatus = null; // Possible values: 'found' or 'not_found'

// Configure your email transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'badraldeenrasea@gmail.com',      // Replace with your email address
    pass: 'lenp ozew pevq cmey',             // Replace with your email password or app-specific password
  },
});

// Function to send email notifications
function sendEmail(subject, message) {
  const mailOptions = {
    from: 'baderrasaa8@gmail.com',           // Sender address
    to: 'baderrasaa8@gmail.com',             // Recipient address (can be the same as sender)
    subject,
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

// --- Monitor Function ---
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

// Immediately check the website on startup and then every 30 seconds
checkWebsite();
setInterval(checkWebsite, 30 * 1000);

// --- Express Server for Updating the Search Word ---

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Home page: Display current search word and a form to update it with Bootstrap styling.
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <title>Website Monitor Configuration</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body {
          background-color: #f8f9fa;
          padding-top: 50px;
        }
        .container {
          max-width: 600px;
        }
        .card {
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="text-center">Website Monitor Configuration</h1>
        <div class="card">
          <div class="card-body">
            <p class="card-text">
              <strong>Current search word:</strong> <span id="currentWord">${wordToFind}</span>
            </p>
            <form method="POST" action="/update">
              <div class="mb-3">
                <label for="word" class="form-label">Enter new search word/phrase:</label>
                <input type="text" class="form-control" id="word" name="word" value="${wordToFind}" required>
              </div>
              <button type="submit" class="btn btn-primary w-100">Update Search Word</button>
            </form>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

// Update the search word from the form submission.
app.post('/update', (req, res) => {
  if (req.body.word) {
    wordToFind = req.body.word.trim();
    console.log('Updated search word:', wordToFind);
  }
  res.redirect('/');
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Configuration server is running on http://localhost:${PORT}`);
});
