const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const File = require('../models/File');
const fs = require('fs');
const path = require('path'); // ✅ Fixes the error


const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage });

// 🔐 Protect this route with JWT auth middleware
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { tags } = req.body;

    const file = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filePath: req.file.path,
      user: req.user,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [] // ✅ convert to array
    });

    await file.save();
    res.status(201).json({ message: 'File uploaded!', file });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
router.get('/', auth, async (req, res) => {
  try {
    const files = await File.find({ user: req.user }).sort({ uploadDate: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/upload/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.user.toString() !== req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Delete from disk if exists
    const filePath = path.join(__dirname, '..', file.filePath);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (!err) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log('❌ Error deleting file:', err.message);
          } else {
            console.log('✅ File deleted from disk');
          }
        });
      } else {
        console.log('⚠️ File not found on disk, skipping fs delete');
      }
    });

    // ✅ Delete from MongoDB using deleteOne
    await File.deleteOne({ _id: file._id });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.log('❌ DELETE error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/:id/download', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check ownership
    if (file.user.toString() !== req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const filePath = path.join(__dirname, '..', file.filePath);

    // ✅ Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: 'File not found on disk' });
      }

      // ✅ Force download
      res.download(filePath, file.originalname);
    });
  } catch (err) {
    console.error('❌ Download error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
