const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check - Render isko check karta hai
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    email: process.env.EMAIL_USER || 'not-set',
    brevo: !!process.env.BREVO_API_KEY 
  });
});

// Main email route
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          name: 'DSX ECOM', 
          email: process.env.EMAIL_USER 
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
        textContent: text || 'Order from DSX'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    console.log('Email sent:', data.messageId);
    res.json({ success: true, messageId: data.messageId });

  } catch (error) {
    console.error('Brevo Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
