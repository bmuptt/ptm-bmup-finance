import { Request, Response, NextFunction } from 'express';
import membershipDuesService from '../services/membership-dues.service';
import { ResponseError } from '../config/response-error';
import { config } from '../config/environment';
import { PayDuesRequest } from '../model/membership-dues.model';
import { deleteFile } from '../utils/file.util';

class MembershipDuesController {
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const request: PayDuesRequest = req.body;
      const result = await membershipDuesService.updateStatus(request, req.user!.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { amount: result.amount },
      });
    } catch (e) {
      next(e);
    }
  }

  async uploadProof(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const statusFile = Number(req.body.status_file);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ResponseError(400, 'Invalid membership dues ID');
      }

      if (!Number.isInteger(statusFile) || (statusFile !== 0 && statusFile !== 1)) {
        throw new ResponseError(400, 'status_file must be 0 or 1');
      }

      const filePath = req.file ? `${config.APP_URL}/storage/proof_file/${req.file.filename}` : undefined;
      const result = await membershipDuesService.updateProofById(id, statusFile, filePath, req.user!.id);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { path: result.path ?? null },
      });
    } catch (e) {
        if (req.file) {
          deleteFile(req.file.path);
        }
        next(e);
    }
  }

  async getList(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const period_year = req.query.period_year ? Number(req.query.period_year) : new Date().getFullYear();
      const search = req.query.search ? String(req.query.search) : undefined;
      const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
      
      // Get token from cookie if available, otherwise from authorization header
      let token: string | undefined = undefined;
      if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      } else if (req.headers.authorization) {
        token = req.headers.authorization;
      }

      const result = await membershipDuesService.getList({
        page,
        limit,
        period_year,
        ...(search ? { search } : {}),
        ...(cursor ? { cursor } : {}),
        ...(token ? { token } : {}),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      // Token forwarding for external setting service (from cookie or auth header)
      let token: string | undefined = undefined;
      if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      } else if (req.headers.authorization) {
        token = req.headers.authorization;
      }

      const result = await membershipDuesService.getDetailById(id, token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new MembershipDuesController();
















