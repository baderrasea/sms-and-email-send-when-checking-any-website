const express = require('express');
const bodyParser = require('body-parser');
const { firefox } = require('@playwright/test');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// --- Persistent Storage Setup ---
const storageFilePath = path.join(__dirname, 'searchPhrases.json');
const defaultPhrases = [
  "Der Server ist ausgelastet",
  "The server is currently busy",
  "Le server est occupé",
  "El servidor está saturado",
  "Сервер перегружен",
  "El servidor está ocupado",
];

function getStoredPhrases() {
  try {
    if (fs.existsSync(storageFilePath)) {
      const data = fs.readFileSync(storageFilePath, 'utf8');
      const json = JSON.parse(data);
      return Array.isArray(json.phrases) && json.phrases.length > 0 ? json.phrases : defaultPhrases;
    }
  } catch (err) {
    console.error('Error reading storage file:', err);
  }
  return defaultPhrases;
}

function storePhrases(phrases) {
  const data = { phrases };
  fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2));
  console.log('Phrases saved to storage.');
}

// --- Monitor Configuration ---
const url = 'https://service2.diplo.de/rktermin/extern/appointment_showMonth.do?locationCode=mask&realmId=354&categoryId=1638&dateStr=09.02.2025';
let phrasesToFind = getStoredPhrases();
let lastStatus = null;
let lastFullResponse = "No response fetched yet.";
let isChecking = false; // Prevent overlapping checks

// Email and Twilio Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'badraldeenrasea@gmail.com',
    pass: 'lenp ozew pevq cmey',
  },
});

const accountSid = 'ACe49c9576b39f7bed379e3df12948bbd2';
const authToken = '0e8143121cd6e97d6ee8513279afe613';
const client = require('twilio')(accountSid, authToken);
const twilioPhoneNumber = '+19785107097';
const yourPhoneNumber = '+967778956556';

function sendEmail(subject, message) {
  const mailOptions = {
    from: 'baderrasaa8@gmail.com',
    to: 'kidsundkinder@gmail.com, baderrasaa8@gmail.com',
    subject,
    text: message,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) console.error('Error sending email:', error);
    else console.log('Email sent');
  });
}

function sendSMS(messageText) {
  client.messages
    .create({
      body: messageText,
      from: twilioPhoneNumber,
      to: yourPhoneNumber,
    })
    .catch(error => console.error('Error sending SMS:', error));
}

function makePhoneCall(messageText) {
  client.calls
    .create({
      twiml: `<Response><Say voice="alice">${messageText}</Say></Response>`,
      to: yourPhoneNumber,
      from: twilioPhoneNumber,
    })
    .catch(error => console.error('Error initiating call:', error));
}

// --- Monitor Function with Improved Error Handling ---
async function checkWebsite() {
  if (isChecking) {
    console.log('Skipping check: Previous check still in progress');
    return;
  }
  isChecking = true;

  let browser;
  try {
    browser = await firefox.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const timeStamp = new Date().toLocaleString();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const content = await page.content();
    lastFullResponse = content;

    if (lastStatus === 'server_down') {
      const upMessage = `تنبيه: عاد الخادم للعمل في ${timeStamp}.`;
      sendEmail('تنبيه: الخادم عاد للعمل', upMessage);
      sendSMS(upMessage);
    }

    const foundPhrases = phrasesToFind.filter(phrase => content.includes(phrase));
    if (foundPhrases.length > 0) {
      console.log(`Found phrases at ${timeStamp}`);
      if (lastStatus !== 'found') {
        const alertMessage = `تنبيه: تم العثور على العبارات في ${timeStamp}: ${foundPhrases.join(', ')}`;
        sendEmail('تنبيه العثور على العبارات', alertMessage);
        sendSMS(alertMessage);
        lastStatus = 'found';
      }
    } else {
      console.log(`No phrases found at ${timeStamp}`);
      if (lastStatus !== 'not_found') {
        const alertMessage = `تنويه: لم يتم العثور على أي عبارات في ${timeStamp}`;
        sendEmail('تنبيه عدم العثور على العبارات', alertMessage);
        sendSMS(alertMessage);
        makePhoneCall(alertMessage);
        lastStatus = 'not_found';
      }
    }
  } catch (error) {
    console.error('Error during check:', error.message);
    lastFullResponse = `Error: ${error.message}`;
    const alertMessage = `تنويه: خطأ في الفحص في ${new Date().toLocaleString()} - ${error.message}`;
    sendEmail('تنبيه خطأ في الفحص', alertMessage);
    sendSMS(alertMessage);
    makePhoneCall(alertMessage);
    lastStatus = 'server_down';
  } finally {
    if (browser) await browser.close().catch(err => console.error('Error closing browser:', err));
    isChecking = false;
  }
}

// Start checks with 45-second interval
setInterval(checkWebsite, 45 * 1000);
checkWebsite(); // Initial check

// --- Express Server ---
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  const phrasesText = phrasesToFind.join('\n');
  res.send(`
    <!DOCTYPE html>
    <html lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>مراقبة الموقع</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>pre { background: #eee; padding: 15px; }</style>
    </head>
    <body class="container mt-4">
      <h1 class="mb-4">مراقبة الموقع</h1>
      <div class="card mb-4">
        <div class="card-body">
          <form method="POST" action="/update">
            <textarea class="form-control mb-3" name="phrases" rows="8">${phrasesText}</textarea>
            <button type="submit" class="btn btn-primary w-100">تحديث العبارات</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <pre>${lastFullResponse}</pre>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/update', (req, res) => {
  if (req.body.phrases) {
    phrasesToFind = req.body.phrases
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);
    storePhrases(phrasesToFind);
  }
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});