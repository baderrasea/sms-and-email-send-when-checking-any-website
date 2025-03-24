const express = require('express');
const bodyParser = require('body-parser');
const { firefox } = require('@playwright/test'); // Using Firefox instead of Chromium
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// --- Persistent Storage Setup ---
const storageFilePath = path.join(__dirname, 'searchPhrases.json');

// Default phrases (from the image)
const defaultPhrases = [
  "Der Server ist ausgelastet",
  "The server is currently busy",
  "Le server est occupé",
  "El servidor está saturado",
  "Сервер перегружен",
  "El servidor está ocupado",
];

// Reads stored phrases from file or returns default if file doesn't exist.
function getStoredPhrases() {
  try {
    if (fs.existsSync(storageFilePath)) {
      const data = fs.readFileSync(storageFilePath, 'utf8');
      const json = JSON.parse(data);
      return Array.isArray(json.phrases) && json.phrases.length > 0
        ? json.phrases
        : defaultPhrases;
    }
  } catch (err) {
    console.error('Error reading storage file:', err);
  }
  return defaultPhrases;
}

// Stores the list of phrases in the file.
function storePhrases(phrases) {
  const data = { phrases };
  fs.writeFile(storageFilePath, JSON.stringify(data, null, 2), (err) => {
    if (err) console.error('Error writing to storage file:', err);
    else console.log('Phrases saved to storage.');
  });
}

// --- Monitor Configuration ---
const url = 'https://service2.diplo.de/rktermin/extern/appointment_showMonth.do?locationCode=mask&realmId=354&categoryId=1638&dateStr=09.02.2025'; // URL to monitor
let phrasesToFind = getStoredPhrases();
// lastStatus can be: 'found', 'not_found', or 'server_down'
let lastStatus = null;
let lastFullResponse = "No response fetched yet.";

// Configure your email transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'badraldeenrasea@gmail.com',      // Replace with your email address
    pass: 'lenp ozew pevq cmey',             // Replace with your email password or app-specific password
  },
});

// --- Twilio Configuration ---
const accountSid = 'ACe49c9576b39f7bed379e3df12948bbd2';
const authToken = '0e8143121cd6e97d6ee8513279afe613'; // Replace with your actual Twilio Auth Token
const client = require('twilio')(accountSid, authToken);
const twilioPhoneNumber = '+19785107097'; // Your Twilio phone number
const yourPhoneNumber = '+967778956556';  // Your mobile number in E.164 format

// Sends email notifications (Arabic message)
// Sends to both kidsundkinder@gmail.com and baderrasaa8@gmail.com.
function sendEmail(subject, message) {
  const mailOptions = {
    from: 'baderrasaa8@gmail.com',
    to: 'kidsundkinder@gmail.com, baderrasaa8@gmail.com',
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

// Sends an SMS via Twilio (Arabic message)
function sendSMS(messageText) {
  client.messages
    .create({
      body: messageText,
      from: twilioPhoneNumber,
      to: yourPhoneNumber,
    })
    .then(message => console.log('SMS sent, SID:', message.sid))
    .catch(error => console.error('Error sending SMS:', error));
}

// Makes a phone call via Twilio (only when no phrase is found or on error)
function makePhoneCall(messageText) {
  client.calls
    .create({
      twiml: `<Response><Say voice="alice">${messageText}</Say></Response>`,
      to: yourPhoneNumber,
      from: twilioPhoneNumber,
    })
    .then(call => console.log('Call initiated, SID:', call.sid))
    .catch(error => console.error('Error initiating call:', error));
}

// --- Monitor Function ---
async function checkWebsite() {
  const browser = await firefox.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    const timeStamp = new Date().toLocaleString();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const content = await page.content();
    lastFullResponse = content; // Save full response for display

    // If the server was previously down, notify that it's up again.
    if (lastStatus === 'server_down') {
      const upMessage = `تنبيه: عاد الخادم للعمل في ${timeStamp}.`;
      sendEmail('تنبيه: الخادم عاد للعمل', upMessage);
      sendSMS(upMessage);
      lastStatus = null;
    }

    // Find which phrases are present in the content.
    const foundPhrases = phrasesToFind.filter(phrase => content.includes(phrase));

    if (foundPhrases.length > 0) {
      console.log(`Found phrases at ${timeStamp}.`);
      if (lastStatus !== 'found') {
        const alertMessage = `تنبيه: تم العثور على العبارات التالية في الموقع في ${timeStamp}: ${foundPhrases.join(', ')}`;
        sendEmail('تنبيه العثور على العبارات', alertMessage);
        sendSMS(alertMessage);
        lastStatus = 'found';
      }
    } else {
      console.log(`No phrases found at ${timeStamp}.`);
      if (lastStatus !== 'not_found') {
        const alertMessage = `تنويه: لم يتم العثور على أي من العبارات في الموقع في ${timeStamp}.`;
        sendEmail('تنبيه عدم العثور على العبارات', alertMessage);
        sendSMS(alertMessage);
        makePhoneCall(alertMessage);
        lastStatus = 'not_found';
      }
    }
  } catch (error) {
    const timeStamp = new Date().toLocaleString();
    console.error('Error loading the page:', error.message);
    lastFullResponse = `Error loading the page: ${error.message}`;
    // Always notify when there's an error.
    const alertMessage = `تنويه: الخادم معطل في ${timeStamp}. خطأ: ${error.message}`;
    sendEmail('تنبيه: الخادم معطل', alertMessage);
    sendSMS(alertMessage);
    makePhoneCall(alertMessage);
    lastStatus = 'server_down';
  } finally {
    await browser.close();
  }
}

// Replace setInterval with a polling loop to prevent overlapping executions.
async function pollWebsite() {
  await checkWebsite();
  setTimeout(pollWebsite, 30000);
}
pollWebsite();

// --- Express Server for Updating the Phrases and Showing Full Response ---
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  const phrasesText = phrasesToFind.join('\n');
  res.send(`
    <!DOCTYPE html>
    <html lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <title>إعداد مراقبة الموقع</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <style>
        body { background-color: #f8f9fa; padding-top: 50px; }
        .container { max-width: 800px; }
        .card { margin-top: 20px; }
        pre { background: #eee; padding: 15px; white-space: pre-wrap; word-wrap: break-word; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="text-center">إعداد مراقبة الموقع</h1>
        <div class="card mb-3">
          <div class="card-body">
            <p class="card-text"><strong>العبارات الحالية:</strong></p>
            <pre>${phrasesText}</pre>
            <form method="POST" action="/update">
              <div class="mb-3">
                <label for="phrases" class="form-label">أدخل العبارات الجديدة (كل عبارة في سطر):</label>
                <textarea class="form-control" id="phrases" name="phrases" rows="8" required>${phrasesText}</textarea>
              </div>
              <button type="submit" class="btn btn-primary w-100">تحديث العبارات</button>
            </form>
          </div>
        </div>
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">المحتوى الكامل المستلم من الموقع:</h5>
            <pre>${lastFullResponse}</pre>
          </div>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
  `);
});

app.post('/update', (req, res) => {
  if (req.body.phrases) {
    const newPhrases = req.body.phrases
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (newPhrases.length > 0) {
      phrasesToFind = newPhrases;
      lastStatus = null;
      storePhrases(phrasesToFind);
      console.log('Updated phrases:', phrasesToFind);
    }
  }
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const appUrl = `http://localhost:${PORT}`;
  console.log(`Configuration server is running on ${appUrl}`);
});
