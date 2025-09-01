import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'user', 'assets', 'images', 'trading_cards_img');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images
const fileFilter = (req: any, file: any, cb: any) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  }
});

// Helper function to upload a single file
export const uploadOne = (file: any, uploadPath: string): string => {
  if (!file) return '';
  
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname);
  const filename = file.fieldname + '-' + uniqueSuffix + ext;
  const fullPath = path.join(uploadPath, filename);
  
  // Move file to destination
  fs.renameSync(file.path, fullPath);
  
  return filename;
};

// Helper function to delete a file
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to get file URL
export const getFileUrl = (filename: string): string => {
  if (!filename) return '';
  return `/user/assets/images/trading_cards_img/${filename}`;
};
