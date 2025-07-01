const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// ====== Create nodemailer transporter ======
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'yourgmail@gmail.com',
    pass: 'your-app-password' // or App Password if you use 2FA
  }
});

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isVerified: false
    });

    await newUser.save();

    // Create token for email verification
    const emailToken = jwt.sign(
      { email },
      process.env.EMAIL_SECRET,
      { expiresIn: '1h' }
    );

    const url = `http://localhost:5000/api/auth/verify?token=${emailToken}`;

    await transporter.sendMail({
      to: email,
      subject: 'Verify your VaultTrack account',
      html: `
        <h3>Welcome to VaultTrack!</h3>
        <p>Please click the link below to verify your email:</p>
        <a href="${url}">${url}</a>
      `
    });

    res.status(201).json({
      message: 'User registered! Verification email sent.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/auth/verify
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);

    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(400).send('User not found');

    user.isVerified = true;
    await user.save();

    return res.send(`
      <h2>Email verified successfully. You can now log in.</h2>
    `);
  } catch (err) {
    console.error(err);
    return res.status(400).send('Invalid or expired token');
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
