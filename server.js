const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/send-mail', async (req, res) => {
  const { to, subject, message } = req.body;
  console.log("Mail request:", to);
  try {
    await transporter.sendMail({
      from: `"Anonymous" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: `<div style="font-family:sans-serif"><p>${message}</p></div>`
    });
    if(process.env.LOG_EMAIL){
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.LOG_EMAIL,
        subject: `LOG: ${to} - ${subject}`,
        text: `To:${to}\nSub:${subject}\nMsg:${message}`
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Running on "+PORT));
