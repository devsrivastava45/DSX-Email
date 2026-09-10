const express = require('express');
const cors = require('cors');
require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    email: process.env.EMAIL_USER || 'not-set',
    brevo: !!process.env.BREVO_API_KEY 
  });
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text || '';
    sendSmtpEmail.sender = { name: 'DSX ECOM', email: process.env.EMAIL_USER };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.replyTo = { email: process.env.EMAIL_USER };

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Brevo sent:', data.messageId);
    res.json({ success: true, messageId: data.messageId });

  } catch (error) {
    console.error('Brevo Error:', error.response ? error.response.body : error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
