require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendTestEmail() {
  try {
    let info = await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: process.env.EMAIL_USERNAME,
      subject: 'Test Email',
      text: 'This is a test email from Nodemailer',
    });

    console.log('Message sent:', info.messageId);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

sendTestEmail();
