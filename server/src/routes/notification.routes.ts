import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.post('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);

export default router;
