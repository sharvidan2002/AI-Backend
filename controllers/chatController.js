const Document = require('../models/Document');
const ChatHistory = require('../models/ChatHistory');
const geminiService = require('../services/geminiService');
const { formatResponse } = require('../utils/responseFormatter');

class ChatController {
  async sendMessage(req, res) {
    try {
      const { documentId, message } = req.body;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      if (!message || message.trim() === '') {
        return res.status(400).json(formatResponse(false, 'Message cannot be empty'));
      }

      // Get the document
      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      // Get or create chat history
      let chatHistory = await ChatHistory.findOne({ documentId });

      if (!chatHistory) {
        chatHistory = new ChatHistory({
          documentId,
          messages: []
        });
      }

      // Prepare document content for context
      const documentContent = `
Original Text: ${document.extractedText}

Analysis Summary: ${document.analysis?.summary || ''}

Key Points: ${document.analysis?.keyPoints?.join(', ') || ''}

Concepts: ${document.analysis?.concepts?.join(', ') || ''}
      `.trim();

      // Get previous chat messages for context
      const previousMessages = chatHistory.messages.slice(-10); // Last 10 messages for context

      // Get AI response
      const aiResponse = await geminiService.answerQuestion(
        message,
        documentContent,
        previousMessages
      );

      if (!aiResponse.success) {
        return res.status(500).json(formatResponse(false, 'Failed to generate response'));
      }

      // Add user message to history
      chatHistory.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Add AI response to history
      chatHistory.messages.push({
        role: 'assistant',
        content: aiResponse.answer,
        timestamp: new Date()
      });

      // Save chat history
      await chatHistory.save();

      const response = {
        chatId: chatHistory._id,
        userMessage: message,
        aiResponse: aiResponse.answer,
        timestamp: new Date(),
        messageCount: chatHistory.messages.length
      };

      res.json(formatResponse(true, 'Message sent successfully', response));

    } catch (error) {
      console.error('Send message error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to send message', null, error.message));
    }
  }

  async getChatHistory(req, res) {
    try {
      const documentId = req.params.documentId;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      // Verify document exists
      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      // Get chat history
      const chatHistory = await ChatHistory.findOne({ documentId });

      if (!chatHistory) {
        return res.json(formatResponse(true, 'No chat history found', {
          documentId,
          messages: [],
          totalMessages: 0
        }));
      }

      const response = {
        chatId: chatHistory._id,
        documentId: documentId,
        messages: chatHistory.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        totalMessages: chatHistory.messages.length,
        lastUpdated: chatHistory.updatedAt
      };

      res.json(formatResponse(true, 'Chat history retrieved successfully', response));

    } catch (error) {
      console.error('Get chat history error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to retrieve chat history'));
    }
  }

  async clearChatHistory(req, res) {
    try {
      const documentId = req.params.documentId;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      // Verify document exists
      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      // Clear chat history
      const chatHistory = await ChatHistory.findOne({ documentId });

      if (chatHistory) {
        chatHistory.messages = [];
        chatHistory.updatedAt = new Date();
        await chatHistory.save();
      }

      res.json(formatResponse(true, 'Chat history cleared successfully'));

    } catch (error) {
      console.error('Clear chat history error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to clear chat history'));
    }
  }

  async getDocumentContext(req, res) {
    try {
      const documentId = req.params.documentId;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      const response = {
        documentId: document._id,
        userPrompt: document.userPrompt,
        extractedText: document.extractedText.substring(0, 500) + '...', // Limited preview
        analysis: {
          summary: document.analysis?.summary,
          keyPoints: document.analysis?.keyPoints?.slice(0, 3), // First 3 key points
          concepts: document.analysis?.concepts?.slice(0, 5)    // First 5 concepts
        },
        createdAt: document.createdAt
      };

      res.json(formatResponse(true, 'Document context retrieved successfully', response));

    } catch (error) {
      console.error('Get document context error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to retrieve document context'));
    }
  }

  async getAllChats(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const chats = await ChatHistory.find()
        .populate('documentId', 'userPrompt analysis.summary createdAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ChatHistory.countDocuments();

      const response = {
        chats: chats.map(chat => ({
          chatId: chat._id,
          documentId: chat.documentId?._id,
          documentSummary: chat.documentId?.analysis?.summary || 'No summary',
          userPrompt: chat.documentId?.userPrompt || 'No prompt',
          messageCount: chat.messages.length,
          lastMessage: chat.messages.length > 0 ?
            chat.messages[chat.messages.length - 1].content.substring(0, 100) + '...' :
            'No messages',
          lastUpdated: chat.updatedAt,
          createdAt: chat.createdAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalChats: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      res.json(formatResponse(true, 'Chat list retrieved successfully', response));

    } catch (error) {
      console.error('Get all chats error:', error);
      res.status(500).json(formatResponse(false, 'Failed to retrieve chat list'));
    }
  }
}

module.exports = new ChatController();