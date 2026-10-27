import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePin,
} from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  sendMessageSchema,
  editMessageSchema,
  addReactionSchema,
} from '../validators/chat.validator.js';

const router = Router();

router.use(authenticate);

router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', validateBody(sendMessageSchema), sendMessage);
router.patch('/messages/:id', validateBody(editMessageSchema), editMessage);
router.delete('/messages/:id', deleteMessage);
router.post('/messages/:id/reactions', validateBody(addReactionSchema), toggleReaction);
router.post('/messages/:id/pin', togglePin);

export default router;
