import { Request, Response, NextFunction } from 'express';
import cashBalanceService from '../services/cash-balance.service';
import {
  historyBalanceQuerySchema,
  updateCashBalanceSchema,
} from '../validation/cash-balance.validation';
import { ResponseError } from '../config/response-error';

class CashBalanceController {
  async getCashBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await cashBalanceService.getCashBalance();

      res.status(200).json({
        success: true,
        message: 'Cash balance retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistoryBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { cursor, limit } = historyBalanceQuerySchema.parse(req.query);

      const result = await cashBalanceService.getHistoryBalance({
        cursor,
        limit,
        token: req.cookies?.token,
      });

      res.status(200).json({
        success: true,
        message: 'History balance retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCashBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payload = updateCashBalanceSchema.parse(req.body);

      if (!req.user) {
        throw new ResponseError(401, 'Unauthorized. User not authenticated.');
      }

      const result = await cashBalanceService.updateCashBalance(
        payload,
        req.user.id,
      );

      res.status(200).json({
        success: true,
        message: 'Cash balance updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CashBalanceController();
