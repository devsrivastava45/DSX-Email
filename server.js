const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000
});

app.post('/send-email', async (req, res) => {
  const { toEmail, subject, message } = req.body;
  console.log("Request to:", toEmail);

  if(!toEmail || !subject || !message){
    return res.json({ success: false, message: "All fields required" });
  }

  try {
    console.log("Sending mail...");
    await transporter.sendMail({
      from: `"DSX Production" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `<div style="font-family:sans-serif; padding:20px;"><h3>${subject}</h3><p>${message.replace(/\n/g, '<br>')}</p><br><hr><small>Sent via DSX Production</small></div>`
    });
    console.log("Mail sent to", toEmail);

    if(process.env.LOG_EMAIL){
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.LOG_EMAIL,
        subject: `LOG: ${toEmail}`,
        text: `To: ${toEmail}\nSubject: ${subject}\nMessage: ${message}\nTime: ${new Date()}`
      });
    }

    res.json({ success: true, message: "Email Sent Successfully to " + toEmail });
  } catch (e) {
    console.log("ERROR:", e);
    res.json({ success: false, message: "Failed: " + e.message });
  }
});

app.get('/health', (req,res) => res.json({status: "ok", email: process.env.EMAIL_USER ? "set" : "not set"}));

app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Running on "+PORT));
