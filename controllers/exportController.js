const Document = require('../models/Document');
const ChatHistory = require('../models/ChatHistory');
const { generatePDF } = require('../utils/pdfGenerator');
const { formatResponse } = require('../utils/responseFormatter');
const path = require('path');

class ExportController {
  async exportDocument(req, res) {
    try {
      const documentId = req.params.id;
      const exportType = req.query.type || 'complete'; // complete, summary, quiz, notes

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      // Chat history removed from exports
      let chatHistory = null;

      // Prepare data for PDF generation
      const exportData = {
        document,
        chatHistory,
        exportType
      };

      // Generate PDF
      const pdfBuffer = await generatePDF(exportData);

      // Set response headers
      const filename = `study-material-${documentId}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Export document error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to export document', null, error.message));
    }
  }

  async exportSummary(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      const exportData = {
        document,
        exportType: 'summary'
      };

      const pdfBuffer = await generatePDF(exportData);

      const filename = `summary-${documentId}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Export summary error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to export summary'));
    }
  }

  async exportQuiz(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      if (!document.quizQuestions || document.quizQuestions.length === 0) {
        return res.status(404).json(formatResponse(false, 'No quiz questions found for this document'));
      }

      const exportData = {
        document,
        exportType: 'quiz'
      };

      const pdfBuffer = await generatePDF(exportData);

      const filename = `quiz-${documentId}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Export quiz error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to export quiz'));
    }
  }

  async exportNotes(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      const exportData = {
        document,
        exportType: 'notes'
      };

      const pdfBuffer = await generatePDF(exportData);

      const filename = `notes-${documentId}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Export notes error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to export notes'));
    }
  }

  async exportChatHistory(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      const chatHistory = await ChatHistory.findOne({ documentId });

      if (!chatHistory || chatHistory.messages.length === 0) {
        return res.status(404).json(formatResponse(false, 'No chat history found for this document'));
      }

      const exportData = {
        document,
        chatHistory,
        exportType: 'chat'
      };

      const pdfBuffer = await generatePDF(exportData);

      const filename = `chat-history-${documentId}-${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Export chat history error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to export chat history'));
    }
  }

  async getExportOptions(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      const chatHistory = await ChatHistory.findOne({ documentId });

      const options = {
        complete: {
          available: true,
          description: 'Complete study material with all content',
          includes: ['extracted text', 'analysis', 'quiz questions', 'YouTube videos']
        },
        summary: {
          available: !!document.analysis?.summary,
          description: 'Summary and key points only',
          includes: ['summary', 'key points', 'concepts']
        },
        quiz: {
          available: document.quizQuestions && document.quizQuestions.length > 0,
          description: 'Quiz questions and answers',
          includes: ['quiz questions', 'answers', 'explanations']
        },
      };

      res.json(formatResponse(true, 'Export options retrieved successfully', {
        documentId,
        exportOptions: options
      }));

    } catch (error) {
      console.error('Get export options error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to retrieve export options'));
    }
  }
}

module.exports = new ExportController();