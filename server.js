const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests. Try again later.' }
});
app.use('/send-email', limiter);

app.post('/send-email', async (req, res) => {
  const { toEmail, subject, message } = req.body;
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  if (!toEmail || !subject || !message) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'DSX Production <onboarding@resend.dev>',
      to: toEmail,
      subject: subject,
      html: `<div style="font-family:Arial;padding:20px;line-height:1.6;"><p>${message.replace(/\n/g, '<br>')}</p><hr><small>Sent via DSX Production</small></div>`
    });

    if (error) {
      console.log('❌ RESEND ERROR:', error);
      return res.status(500).json({ success: false, message: error.message, error });
    }

    console.log('✅ Email sent:', data);

    // Log - only if LOG_EMAIL is different from toEmail to avoid duplicate
    if (process.env.LOG_EMAIL && process.env.LOG_EMAIL !== toEmail) {
      await resend.emails.send({
        from: 'DSX Log <onboarding@resend.dev>',
        to: process.env.LOG_EMAIL,
        subject: `📩 Log → ${toEmail}`,
        html: `<p><b>To:</b> ${toEmail}<br><b>Sub:</b> ${subject}<br><b>Msg:</b> ${message}<br><b>IP:</b> ${userIP}<br><b>Time:</b> ${time}</p>`
      });
    }

    res.json({ success: true, message: 'Email sent successfully!', id: data.id });

  } catch (error) {
    console.log('❌ Server Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
