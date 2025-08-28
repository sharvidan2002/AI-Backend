const Document = require('../models/Document');
const googleVisionService = require('../services/googleVisionService');
const geminiService = require('../services/geminiService');
const youtubeService = require('../services/youtubeService');
const { formatResponse } = require('../utils/responseFormatter');

class DocumentController {
  async uploadAndAnalyze(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json(formatResponse(false, 'No image file provided'));
      }

      if (!req.body.prompt) {
        return res.status(400).json(formatResponse(false, 'User prompt is required'));
      }

      const imagePath = req.file.path;
      const userPrompt = req.body.prompt;

      console.log('Processing image:', imagePath);
      console.log('User prompt:', userPrompt);

      // Step 1: Extract text using Google Vision API
      const visionResult = await googleVisionService.detectDocumentStructure(imagePath);

      if (!visionResult.success) {
        return res.status(500).json(formatResponse(false, 'Failed to extract text from image'));
      }

      const extractedText = visionResult.structuredText || visionResult.extractedText;
      console.log('Extracted text length:', extractedText.length);

      // Step 2: Analyze content using Gemini
      const analysisResult = await geminiService.analyzeContent(extractedText, userPrompt);

      if (!analysisResult.success) {
        return res.status(500).json(formatResponse(false, 'Failed to analyze content'));
      }

      // Step 3: Generate quiz questions
      const quizResult = await geminiService.generateQuizQuestions(extractedText, userPrompt);

      // Step 4: Get YouTube video suggestions
      const searchKeywords = analysisResult.analysis.searchKeywords || ['education', 'learning'];
      const youtubeResult = await youtubeService.getEducationalVideos(searchKeywords);

      // Step 5: Save to database
      const documentData = {
        originalImagePath: imagePath,
        userPrompt: userPrompt,
        analysis: {
          summary: analysisResult.analysis.summary,
          explanation: analysisResult.analysis.explanation,
          keyPoints: analysisResult.analysis.keyPoints || [],
          concepts: analysisResult.analysis.concepts || []
        },
        quizQuestions: quizResult.questions || [],
        youtubeVideos: youtubeResult.videos || []
      };

      const document = new Document(documentData);
      await document.save();

      console.log('Document saved with ID:', document._id);

      // Step 6: Return response
      const response = {
        documentId: document._id,
        analysis: document.analysis,
        quizQuestions: document.quizQuestions,
        youtubeVideos: document.youtubeVideos,
        createdAt: document.createdAt
      };

      res.json(formatResponse(true, 'Document processed successfully', response));

    } catch (error) {
      console.error('Upload and analyze error:', error);
      res.status(500).json(formatResponse(false, 'Internal server error', null, error.message));
    }
  }

  async getAllDocuments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const documents = await Document.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id userPrompt analysis.summary createdAt extractedText');

      const total = await Document.countDocuments();

      const response = {
        documents: documents.map(doc => ({
          id: doc._id,
          userPrompt: doc.userPrompt,
          summary: doc.analysis?.summary || 'No summary available',
          createdAt: doc.createdAt,
          textPreview: doc.extractedText.substring(0, 100) + '...'
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDocuments: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

      res.json(formatResponse(true, 'Documents retrieved successfully', response));

    } catch (error) {
      console.error('Get all documents error:', error);
      res.status(500).json(formatResponse(false, 'Failed to retrieve documents'));
    }
  }

  async getDocumentById(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      const response = {
        id: document._id,
        userPrompt: document.userPrompt,
        analysis: document.analysis,
        quizQuestions: document.quizQuestions,
        youtubeVideos: document.youtubeVideos,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      };

      res.json(formatResponse(true, 'Document retrieved successfully', response));

    } catch (error) {
      console.error('Get document by ID error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to retrieve document'));
    }
  }

  async deleteDocument(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      // Delete the document
      await Document.findByIdAndDelete(documentId);

      // Optional: Delete the associated image file
      const fs = require('fs');
      if (fs.existsSync(document.originalImagePath)) {
        fs.unlinkSync(document.originalImagePath);
      }

      res.json(formatResponse(true, 'Document deleted successfully'));

    } catch (error) {
      console.error('Delete document error:', error);

      if (error.name === 'CastError') {
        return res.status(400).json(formatResponse(false, 'Invalid document ID format'));
      }

      res.status(500).json(formatResponse(false, 'Failed to delete document'));
    }
  }

  async regenerateQuestions(req, res) {
    try {
      const documentId = req.params.id;

      if (!documentId) {
        return res.status(400).json(formatResponse(false, 'Document ID is required'));
      }

      const document = await Document.findById(documentId);

      if (!document) {
        return res.status(404).json(formatResponse(false, 'Document not found'));
      }

      // Regenerate quiz questions
      const quizResult = await geminiService.generateQuizQuestions(
        document.extractedText,
        document.userPrompt
      );

      // Update document with new questions
      document.quizQuestions = quizResult.questions || [];
      document.updatedAt = new Date();
      await document.save();

      res.json(formatResponse(true, 'Quiz questions regenerated successfully', {
        quizQuestions: document.quizQuestions
      }));

    } catch (error) {
      console.error('Regenerate questions error:', error);
      res.status(500).json(formatResponse(false, 'Failed to regenerate questions'));
    }
  }
}

module.exports = new DocumentController();