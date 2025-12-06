import { Router } from 'express';
import verifyCoreToken from '../middleware/auth.middleware';
import membershipDuesController from '../controllers/membership-dues.controller';
import { validate } from '../utils/validation';
import { payDuesSchema, uploadDuesSchema, duesIdParamSchema } from '../validation/membership-dues.validation';
import { uploadSingle } from '../config/multer';

const router = Router();

router.put('/dues/:id/proof', verifyCoreToken, validate(duesIdParamSchema, 'params'), uploadSingle('proof_file'), validate(uploadDuesSchema), (req, res, next) =>
  membershipDuesController.uploadProof(req, res, next)
);

// Pay (manual) or update membership dues status (unpaid)
router.post('/dues', verifyCoreToken, validate(payDuesSchema), (req, res, next) =>
  membershipDuesController.updateStatus(req, res, next)
);

router.get('/dues', verifyCoreToken, (req, res, next) =>
  membershipDuesController.getList(req, res, next)
);

router.get('/dues/:id', verifyCoreToken, validate(duesIdParamSchema, 'params'), (req, res, next) =>
  membershipDuesController.getDetail(req, res, next)
);

export default router;
