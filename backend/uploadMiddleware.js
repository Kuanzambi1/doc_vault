const multer = require('multer')
const path   = require('path')
const fs     = require('fs')
const { v4: uuidv4 } = require('uuid')

const UPLOAD_DIR  = process.env.UPLOAD_DIR    || './uploads'
const MAX_SIZE_MB = process.env.MAX_FILE_SIZE_MB || 50

const ALLOWED = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new Error(`Tipo não permitido: ${file.mimetype}`), false),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
})

module.exports = { upload, UPLOAD_DIR }
