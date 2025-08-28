const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const documentController = require('../controllers/documentController');

// Upload and analyze image
router.post('/upload', upload.single('image'), documentController.uploadAndAnalyze);

// Get all documents with pagination
router.get('/', documentController.getAllDocuments);

// Get specific document by ID
router.get('/:id', documentController.getDocumentById);

// Delete document by ID
router.delete('/:id', documentController.deleteDocument);

// Regenerate quiz questions for a document
router.post('/:id/regenerate-quiz', documentController.regenerateQuestions);

module.exports = router;