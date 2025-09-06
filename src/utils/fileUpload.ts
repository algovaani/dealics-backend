import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'user', 'assets', 'images', 'trading_cards_img');
const profileUploadDir = path.join(process.cwd(), 'public', 'user', 'assets', 'images', 'profile_images');

console.log('📁 Upload directories:', {
  uploadDir: uploadDir,
  profileUploadDir: profileUploadDir,
  uploadDirExists: fs.existsSync(uploadDir),
  profileUploadDirExists: fs.existsSync(profileUploadDir)
});

if (!fs.existsSync(uploadDir)) {
  console.log('📁 Creating upload directory:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(profileUploadDir)) {
  console.log('📁 Creating profile upload directory:', profileUploadDir);
  fs.mkdirSync(profileUploadDir, { recursive: true });
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

// Configure multer for trading cards
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  }
});

// Configure multer for profile images
const profileStorage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, profileUploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    // Generate unique filename for profile images
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

export const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  }
});

// Helper function to upload a single file
export const uploadOne = (file: any, uploadType: string): string => {
  if (!file) return '';
  
  try {
    // Determine the correct upload directory based on type
    let targetDir: string;
    if (uploadType === 'users' || uploadType === 'profile') {
      targetDir = profileUploadDir;
    } else {
      targetDir = uploadDir;
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = uploadType === 'users' || uploadType === 'profile' 
      ? 'profile-' + uniqueSuffix + ext 
      : file.fieldname + '-' + uniqueSuffix + ext;
    
    const fullPath = path.join(targetDir, filename);
    
    console.log('📁 Upload details:', {
      originalPath: file.path,
      targetPath: fullPath,
      filename: filename,
      uploadType: uploadType
    });
    
    // Move file to destination
    fs.renameSync(file.path, fullPath);
    
    console.log('✅ File uploaded successfully:', filename);
    return filename;
  } catch (error: any) {
    console.error('❌ Error in uploadOne:', error);
    return '';
  }
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

// Helper function to get profile image URL
export const getProfileImageUrl = (filename: string): string => {
  if (!filename) return '';
  return `/user/assets/images/profile_images/${filename}`;
};
