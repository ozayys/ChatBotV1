import express from 'express';
import { 
  getChatHistory, 
  getConversationMessages,
  createConversation,
  sendMessage,
  sendStreamingMessage,
  clearConversation,
  deleteConversation,
  clearChatHistory,
  getUserSettings,
  updateUserSettings,
  getUserStatistics,
  fixConversationModelTypes
} from '../controllers/chatController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware as any);

// Conversation routes
router.get('/conversations', getChatHistory as any);
router.post('/conversations', createConversation as any);
router.get('/conversations/:conversationId', getConversationMessages as any);
router.delete('/conversations/:conversationId', deleteConversation as any);
router.delete('/conversations/:conversationId/messages', clearConversation as any);

// Message routes
router.post('/messages', sendMessage as any);
router.post('/messages/stream', sendStreamingMessage as any);

// Clear all chat history
router.delete('/history', clearChatHistory as any);

// User settings routes
router.get('/settings', getUserSettings as any);
router.put('/settings', updateUserSettings as any);

// User statistics routes
router.get('/statistics', getUserStatistics as any);

// Database fix routes
router.post('/fix-model-types', fixConversationModelTypes as any);

export default router; 