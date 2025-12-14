import { Request, Response, NextFunction } from 'express';
import { ResponseError } from '../config/response-error';

export const requireExcelFile = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.file || !req.file.path) {
      next(new ResponseError(400, 'Excel file is required'));
      return;
    }
    next();
  };
};

export default requireExcelFile;

