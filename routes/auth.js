const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// Email transporter config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (verified = false)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verified: false
    });

    await newUser.save();

    // Create verification token
    const emailToken = jwt.sign(
      { email }, // IMPORTANT: dynamic email
      process.env.EMAIL_SECRET,
      { expiresIn: '1d' }
    );

    const verifyUrl = `http://localhost:5000/api/auth/verify?token=${emailToken}`;

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Verify your VaultTrack account',
      html: `<p>Click to verify your account: <a href="${verifyUrl}">${verifyUrl}</a></p>`
    });

    console.log('Verification email sent to:', email);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.'
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
    console.log('Decoded payload:', decoded);

    const result = await User.updateOne(
      { email: decoded.email },
      { $set: { isVerified: true } }
    );

    console.log('Update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).send('User not found');
    }

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
    if (!user.verified) {
      return res.status(400).json({ message: 'Please verify your email before logging in.' });
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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.verified) {
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
