/**
 * uploadMiddleware.js — Multer Configuration for Avatar & Media Uploads
 *
 * Implements:
 *  - Secure disk storage with unique, sanitized filenames
 *  - Whitelist validation of MIME types and extensions (JPEG, PNG, WEBP)
 *  - File size limitations (configurable via MAX_FILE_SIZE_MB, default 5MB)
 *  - Prevention of executable uploads & path traversal
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique filename: avatar-<userId/anon>-<timestamp>-<random><ext>
    const userId = req.user ? req.user._id.toString() : 'guest';
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `avatar-${userId}-${timestamp}-${random}${ext}`;
    cb(null, safeFilename);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);

  if (isMimeAllowed && isExtAllowed) {
    return cb(null, true);
  }

  const error = new Error('Invalid file type: Only .jpg, .jpeg, .png, and .webp images are allowed');
  error.statusCode = 400;
  return cb(error, false);
};

// File size limit (default 5MB)
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5;
const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
  },
  fileFilter,
});

/**
 * Validates actual binary signature (magic bytes) from disk.
 * Prevents disguised executable / malicious file uploads with spoofed MIME types.
 *
 * @param {string} filePath - Absolute path to uploaded file on disk
 * @returns {boolean} true if valid image signature detected
 */
function verifyImageMagicBytes(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }

    // WEBP: RIFF....WEBP
    if (
      bytesRead >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Express wrapper for avatar upload to catch and format Multer errors cleanly
 * and enforce magic byte file signature verification.
 */
const uploadAvatar = (req, res, next) => {
  const singleUpload = upload.single('avatar');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            status: 'error',
            statusCode: 400,
            message: `File too large: Maximum allowed size is ${maxFileSizeMB}MB`,
          });
        }
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message: `Upload error: ${err.message}`,
        });
      }

      // Custom fileFilter error
      return res.status(err.statusCode || 400).json({
        success: false,
        status: 'error',
        statusCode: err.statusCode || 400,
        message: err.message || 'File upload failed',
      });
    }

    // Verify actual file signature from disk if file was written
    if (req.file && req.file.path) {
      const isValidSignature = verifyImageMagicBytes(req.file.path);
      if (!isValidSignature) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
        return res.status(400).json({
          success: false,
          status: 'error',
          statusCode: 400,
          message:
            'Security validation failed: File contents do not match a valid image signature (JPEG, PNG, WEBP)',
        });
      }
    }

    next();
  });
};

module.exports = {
  uploadAvatar,
  maxFileSizeMB,
  verifyImageMagicBytes,
};
