const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('DSX Email Server is Running. Use /health to check.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', email: process.env.EMAIL_USER, brevo: !!process.env.BREVO_API_KEY });
});

app.post('/send-email', async (req, res) => {
  try {
    // frontend se toEmail aata hai, usko handle kiya
    const to = req.body.to || req.body.toEmail;
    const subject = req.body.subject;
    const message = req.body.message || req.body.html;

    if (!to || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 1. Victim ko email jayega - usko dsxproduction45@gmail.com dikhega
    const sendToVictim = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'DSX Production', email: 'dsxproduction45@gmail.com' },
        to: [{ email: to }],
        subject: subject,
        htmlContent: `<div style="font-family:sans-serif; padding:20px;"><p>${message.replace(/\n/g, '<br>')}</p><hr><p style="font-size:12px; color:#888;">Sent via DSX Production</p></div>`,
        textContent: message
      })
    });
    const victimData = await sendToVictim.json();
    if (!sendToVictim.ok) throw new Error(JSON.stringify(victimData));

    // 2. Tujhe log email jayega - srivastavasandip554@gmail.com pe
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'DSX Logger', email: 'dsxproduction45@gmail.com' },
        to: [{ email: process.env.EMAIL_USER }],
        subject: `[LOG] New Anonymous Mail to ${to}`,
        htmlContent: `
          <h3>New Anonymous Email Sent</h3>
          <p><b>To:</b> ${to}</p>
          <p><b>Subject:</b> ${subject}</p>
          <p><b>Message:</b><br>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><b>Sender IP:</b> ${ip}</p>
          <p><b>User-Agent:</b> ${userAgent}</p>
          <p><b>Time:</b> ${new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}</p>
        `
      })
    });

    res.json({ success: true, message: 'Email sent successfully anonymously!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));
