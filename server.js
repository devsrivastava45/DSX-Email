const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many requests. Try again later.'
  }
});

app.use('/send-email', limiter);

// --- FIXED TRANSPORTER FOR RENDER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Render pe IPv6 issue fix
  family: 4 
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Gmail SMTP Error:', error.message);
  } else {
    console.log('✅ Gmail SMTP Ready');
  }
});

app.post('/send-email', async (req, res) => {
  const { toEmail, subject, message } = req.body;
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  if (!toEmail || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid Receiver Email' });
  }

  try {
    await transporter.sendMail({
      from: `"DSX Production" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `<div style="font-family:Arial;padding:20px;"><p>${message.replace(/\n/g, '<br>')}</p><hr><small style="color:#888;">This message was sent via DSX Production</small></div>`
    });

    if(process.env.LOG_EMAIL){
      await transporter.sendMail({
        from: `"DSX Log" <${process.env.EMAIL_USER}>`,
        to: process.env.LOG_EMAIL,
        subject: `Mail Log → ${toEmail}`,
        html: `<h2>📩 Mail Log</h2><p><b>Sent To:</b> ${toEmail}</p><p><b>Subject:</b> ${subject}</p><p><b>Message:</b><br>${message.replace(/\n/g, '<br>')}</p><p><b>User IP:</b> ${userIP}</p><p><b>Time:</b> ${time}</p>`
      });
    }

    res.json({ success: true, message: 'Email sent successfully!' });

  } catch (error) {
    console.log('❌ Email Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Anonymous Mailer running on port ${PORT}`);
});
