import { Router } from 'express';
import cashBalanceRoutes from './cash-balance.route';
import membershipDuesRoutes from './membership-dues.route';

const router = Router();

router.use('/finance', cashBalanceRoutes);
router.use('/finance', membershipDuesRoutes);

export default router;
