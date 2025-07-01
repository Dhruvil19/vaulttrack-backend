const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const uploadRoutes = require('./routes/upload');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());


// Serve uploads folder
app.use('/uploads', express.static('uploads'));

// Use your upload route
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', require('./routes/auth'));


app.listen(5000, () => {
  console.log('✅ Server running on port 5000');
});
