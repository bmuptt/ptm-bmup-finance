import { Router } from 'express';
import verifyCoreToken from '../middleware/auth.middleware';
import cashBalanceController from '../controllers/cash-balance.controller';

const router = Router();

router.get('/cash-balance', verifyCoreToken, (req, res, next) =>
  cashBalanceController.getCashBalance(req, res, next),
);

router.get('/cash-balance/history', verifyCoreToken, (req, res, next) =>
  cashBalanceController.getHistoryBalance(req, res, next),
);

router.put('/cash-balance', verifyCoreToken, (req, res, next) =>
  cashBalanceController.updateCashBalance(req, res, next),
);

export default router;
