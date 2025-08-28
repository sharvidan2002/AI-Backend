const PDFDocument = require('pdfkit');

class PDFGenerator {
  generatePDF(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        // Generate content based on export type
        switch (data.exportType) {
          case 'complete':
            this.generateCompletePDF(doc, data);
            break;
          case 'summary':
            this.generateSummaryPDF(doc, data);
            break;
          case 'quiz':
            this.generateQuizPDF(doc, data);
            break;
          case 'notes':
            this.generateNotesPDF(doc, data);
            break;
          default:
            this.generateCompletePDF(doc, data);
        }

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  generateCompletePDF(doc, data) {
    const { document } = data;

    // Header
    this.addHeader(doc, 'Study Material');

    // Add all content continuously without sections
    this.addContinuousContent(doc, document);
  }

  generateSummaryPDF(doc, data) {
    const { document } = data;

    this.addHeader(doc, 'Study Summary');
    this.addContinuousContent(doc, document, 'summary');
  }

  generateQuizPDF(doc, data) {
    const { document } = data;

    this.addHeader(doc, 'Quiz Questions');
    this.addContinuousContent(doc, document, 'quiz');
  }

  generateNotesPDF(doc, data) {
    const { document } = data;

    this.addHeader(doc, 'Study Notes');
    this.addContinuousContent(doc, document, 'summary');
  }


  addHeader(doc, title) {
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(title, { align: 'center' })
       .moveDown(2);
  }

  addContinuousContent(doc, document, type = 'complete') {
    doc.fontSize(12)
       .font('Helvetica');

    // Add content based on type
    if (type === 'complete' || type === 'summary') {
      // Original content
      if (document.extractedText) {
        doc.text(document.extractedText);
        doc.moveDown(1.5);
      }

      // Analysis summary
      if (document.analysis?.summary) {
        doc.fontSize(14).font('Helvetica-Bold').text('Summary:', { continued: false });
        doc.fontSize(12).font('Helvetica').text(document.analysis.summary);
        doc.moveDown(1);
      }

      // Key points
      if (document.analysis?.keyPoints && document.analysis.keyPoints.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Key Points:', { continued: false });
        doc.fontSize(12).font('Helvetica');
        document.analysis.keyPoints.forEach(point => {
          doc.text(`• ${point}`, { indent: 20 });
        });
        doc.moveDown(1);
      }

      // Concepts
      if (document.analysis?.concepts && document.analysis.concepts.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Concepts:', { continued: false });
        doc.fontSize(12).font('Helvetica');
        document.analysis.concepts.forEach(concept => {
          doc.text(`• ${concept}`, { indent: 20 });
        });
        doc.moveDown(1);
      }

      // Detailed explanation
      if (document.analysis?.explanation && type === 'complete') {
        doc.fontSize(14).font('Helvetica-Bold').text('Detailed Explanation:', { continued: false });
        doc.fontSize(12).font('Helvetica').text(document.analysis.explanation);
        doc.moveDown(1);
      }
    }

    // Quiz questions for complete or quiz type
    if ((type === 'complete' || type === 'quiz') && document.quizQuestions && document.quizQuestions.length > 0) {
      if (type === 'complete') {
        doc.fontSize(14).font('Helvetica-Bold').text('Quiz Questions:', { continued: false });
        doc.moveDown(0.5);
      }
      this.addContinuousQuiz(doc, document.quizQuestions);
    }

    // YouTube videos for complete type
    if (type === 'complete' && document.youtubeVideos && document.youtubeVideos.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Recommended Videos:', { continued: false });
      doc.moveDown(0.5);
      this.addContinuousVideos(doc, document.youtubeVideos);
    }
  }

  addContinuousQuiz(doc, questions) {
    questions.forEach((question, index) => {
      doc.fontSize(13)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${question.question}`);

      doc.fontSize(12)
         .font('Helvetica');

      if (question.type === 'mcq' && question.options) {
        question.options.forEach((option, optIndex) => {
          const label = String.fromCharCode(65 + optIndex);
          const isCorrect = option === question.correctAnswer;
          doc.text(`   ${label}. ${option}${isCorrect ? ' ✓' : ''}`);
        });
      } else {
        doc.text(`   Answer: ${question.correctAnswer}`);
      }

      if (question.explanation) {
        doc.font('Helvetica-Oblique')
           .text(`   Explanation: ${question.explanation}`);
      }

      doc.font('Helvetica').moveDown(0.8);
    });
  }

  addContinuousVideos(doc, videos) {
    videos.slice(0, 8).forEach((video, index) => {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${video.title}`);

      doc.fontSize(11)
         .font('Helvetica')
         .text(`   Channel: ${video.channelTitle}`)
         .text(`   URL: ${video.url}`)
         .moveDown(0.5);
    });
  }

}

const pdfGenerator = new PDFGenerator();

module.exports = {
  generatePDF: (data) => pdfGenerator.generatePDF(data)
};