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

// Tere HTML ke hisaab se fix kiya hai
app.post('/send-email', async (req, res) => {
  const { toEmail, subject, message } = req.body;

  if(!toEmail || !subject || !message){
    return res.json({ success: false, message: "All fields required" });
  }

  try {
    await transporter.sendMail({
      from: `"DSX Production" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee;"><h3>${subject}</h3><p>${message}</p><br><hr><small>Sent via DSX Production Anonymous Mailer</small></div>`
    });

    // Log tere dusre mail pe
    if(process.env.LOG_EMAIL){
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.LOG_EMAIL,
        subject: `LOG: Mail to ${toEmail}`,
        text: `To: ${toEmail}\nSubject: ${subject}\nMessage: ${message}\nTime: ${new Date()}`
      });
    }

    res.json({ success: true, message: "Email Sent Successfully to " + toEmail });
  } catch (e) {
    console.log(e);
    res.json({ success: false, message: "Failed: " + e.message });
  }
});

app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Running on "+PORT));
