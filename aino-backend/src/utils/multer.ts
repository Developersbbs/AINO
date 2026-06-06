import multer from 'multer';

const layoutFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are accepted'));
  }
};

// Memory storage — buffer passed directly to Firebase Storage
export const layoutUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: layoutFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const docFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Accepted: images, PDF, Word, Excel, PowerPoint, TXT, CSV'));
  }
};

// Memory storage — buffer passed directly to Firebase Storage
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// userDocUpload uses memoryStorage so the buffer can be sent to Firebase Storage.
// No file-type filter — accepts images, PDFs, Office docs, and any other file the user needs.
export const userDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const csvFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are accepted'));
  }
};

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});
