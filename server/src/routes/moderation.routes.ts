import { Router } from 'express';
import {
  submitReport,
  getReports,
  updateReportStatus,
  toggleSuspendUser,
} from '../controllers/moderation.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { reportSchema } from '../validators/chat.validator.js';

const router = Router();

router.use(authenticate);

router.post('/report', validateBody(reportSchema), submitReport);

// Admin-only endpoints
router.get('/reports', requireAdmin, getReports);
router.patch('/reports/:id', requireAdmin, updateReportStatus);
router.post('/users/:id/suspend', requireAdmin, toggleSuspendUser);

export default router;
