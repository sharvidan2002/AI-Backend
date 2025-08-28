const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Send a message in chat for a specific document
router.post('/send', chatController.sendMessage);

// Get chat history for a specific document
router.get('/history/:documentId', chatController.getChatHistory);

// Clear chat history for a specific document
router.delete('/history/:documentId', chatController.clearChatHistory);

// Get document context for chat
router.get('/context/:documentId', chatController.getDocumentContext);

// Get all chat sessions
router.get('/', chatController.getAllChats);

module.exports = router;