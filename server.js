const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config(); // .env file load karne ke liye

const app = express();

// RENDER KE LIYE SABSE ZAROORI
const PORT = process.env.PORT || 3000;

// Security + Speed Middleware
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// Rate Limit: 10 emails per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests. Try again later.' }
});
app.use('/send-email', limiter);

// Gmail transporter - ab .env se aayega
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // .env se
    pass: process.env.EMAIL_PASS   // .env se
  }
});

// Verify transporter on start
transporter.verify((error, success) => {
  if (error) console.log("❌ Gmail Error:", error);
  else console.log("✅ Gmail Ready to Send");
});

// Main API
app.post('/send-email', async (req, res) => {
  const { toEmail, subject, message } = req.body;
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  if(!toEmail || !subject || !message){
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)){
    return res.status(400).json({ success: false, message: 'Invalid Receiver Email' });
  }

  try {
    // 1. Send to Receiver - Anonymous
    await transporter.sendMail({
      from: `"DSX Production" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family:Arial; padding:20px;">
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <small style="color:#888;">This message was sent anonymously via DSX Production</small>
        </div>
      `
    });

    // 2. Send Log to You
    await transporter.sendMail({
      from: `"DSX Log" <${process.env.EMAIL_USER}>`,
      to: process.env.LOG_EMAIL, // .env se
      subject: `New Anonymous Mail Sent → ${toEmail}`,
      html: `
        <h2>📩 Proxy Mail Log</h2>
        <p><b>Sent To:</b> ${toEmail}</p>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>Message:</b><br>${message.replace(/\n/g, '<br>')}</p>
        <p><b>User IP:</b> ${userIP}</p>
        <p><b>Time:</b> ${time}</p>
      `
    });

    res.json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.log("Email Error: ", error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Home page serve karne ke liye
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Anonymous Mailer running on port ${PORT}`);
});
