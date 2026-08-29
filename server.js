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
  try {
    await transporter.sendMail({
      from: `"Anonymous" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: message,
      html: `<p>${message}</p><br><p>Sent via DSX Anonymous Mailer</p>`
    });

    // Log tere paas bhi ayega
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.LOG_EMAIL,
      subject: `Log: Mail sent to ${to}`,
      text: `To: ${to}\nSubject: ${subject}\nMessage: ${message}`
    });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false, error: err.message });
  }
});

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log('Server running'));
