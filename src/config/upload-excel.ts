import multer from 'multer';
import path from 'path';
import fs from 'fs';

const baseDir = path.join(process.cwd(), 'storage', 'private', 'imports');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, baseDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.xlsx';
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Only Excel files (.xlsx, .xls) are allowed!') as any;
    error.status = 400;
    cb(error);
  }
};

export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

export const uploadExcelSingle = (fieldName: string) => uploadExcel.single(fieldName);

export default uploadExcel;

