import { Router } from 'express';
import {
  getConversations,
  getOrCreateDirect,
  createGroup,
  joinGroupByCode,
  getConversation,
  getConversationMedia,
  getConversationLinks,
  getConversationDocs,
  leaveGroup,
  toggleArchive,
  toggleMute,
  searchUniversal,
} from '../controllers/conversation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { createGroupSchema, joinGroupSchema } from '../validators/chat.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', getConversations);
router.get('/search/all', searchUniversal);
router.post('/direct', getOrCreateDirect);
router.post('/group', validateBody(createGroupSchema), createGroup);
router.post('/join', validateBody(joinGroupSchema), joinGroupByCode);
router.get('/:id', getConversation);
router.get('/:id/media', getConversationMedia);
router.get('/:id/links', getConversationLinks);
router.get('/:id/docs', getConversationDocs);
router.post('/:id/leave', leaveGroup);
router.post('/:id/archive', toggleArchive);
router.post('/:id/mute', toggleMute);

export default router;
