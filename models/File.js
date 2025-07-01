const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  uploadDate: {
    type: Date,
    default: Date.now
  },
  filePath: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  tags: [String] // ✅ Add this line
});

module.exports = mongoose.model('File', FileSchema);
