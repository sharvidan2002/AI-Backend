const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// Get export options for a document
router.get('/:id/options', exportController.getExportOptions);

// Export complete document
router.get('/:id', exportController.exportDocument);

// Export summary only
router.get('/:id/summary', exportController.exportSummary);

// Export quiz questions only
router.get('/:id/quiz', exportController.exportQuiz);

// Export formatted notes
router.get('/:id/notes', exportController.exportNotes);

// Export chat history
router.get('/:id/chat', exportController.exportChatHistory);

module.exports = router;