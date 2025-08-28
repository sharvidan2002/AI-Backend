const vision = require('@google-cloud/vision');

class GoogleVisionService {
  constructor() {
    try {
      // Check if credentials are properly configured
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
      }

      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
      }

      // Check if the credentials file exists
      const fs = require('fs');
      if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        throw new Error(`Google Cloud credentials file not found at: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      }

      this.client = new vision.ImageAnnotatorClient({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });

      this.isConfigured = true;
      console.log('Google Vision API initialized successfully');
    } catch (error) {
      console.error('Google Vision API initialization error:', error.message);
      this.isConfigured = false;
      this.client = null;
    }
  }

  async extractTextFromImage(imagePath) {
    if (!this.isConfigured) {
      console.warn('Google Vision API not configured, using fallback text extraction');
      return this.fallbackTextExtraction(imagePath);
    }

    try {
      console.log('Extracting text from image:', imagePath);

      // Performs text detection on the image file
      const [result] = await this.client.textDetection(imagePath);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        throw new Error('No text found in the image');
      }

      // The first detection contains the full text
      const extractedText = detections[0].description;

      // Additional processing for better text structure
      const processedText = this.processExtractedText(extractedText);

      return {
        success: true,
        extractedText: processedText,
        rawText: extractedText,
        confidence: detections[0].confidence || 0.8
      };

    } catch (error) {
      console.error('Google Vision API error:', error);
      console.warn('Falling back to manual text extraction');
      return this.fallbackTextExtraction(imagePath);
    }
  }

  processExtractedText(rawText) {
    if (!rawText) return '';

    // Basic text cleaning and formatting
    let processed = rawText
      .replace(/\n+/g, '\n') // Remove multiple line breaks
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .trim();

    return processed;
  }

  async detectDocumentStructure(imagePath) {
    if (!this.isConfigured) {
      console.warn('Google Vision API not configured, using fallback');
      return this.fallbackTextExtraction(imagePath);
    }

    try {
      // Use document text detection for better structure recognition
      const [result] = await this.client.documentTextDetection(imagePath);
      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation) {
        console.warn('No document structure detected, falling back to regular text detection');
        return await this.extractTextFromImage(imagePath);
      }

      const pages = fullTextAnnotation.pages;
      let structuredText = '';

      pages.forEach(page => {
        page.blocks.forEach(block => {
          block.paragraphs.forEach(paragraph => {
            let paragraphText = '';
            paragraph.words.forEach(word => {
              word.symbols.forEach(symbol => {
                paragraphText += symbol.text;
              });
              paragraphText += ' ';
            });
            structuredText += paragraphText.trim() + '\n\n';
          });
        });
      });

      return {
        success: true,
        structuredText: structuredText.trim(),
        confidence: fullTextAnnotation.text ? 0.9 : 0.7
      };

    } catch (error) {
      console.error('Document structure detection error:', error);
      // Fallback to regular text detection
      return await this.extractTextFromImage(imagePath);
    }
  }

  // Fallback method when Google Vision API is not available
  fallbackTextExtraction(imagePath) {
    console.log('Using fallback text extraction for:', imagePath);

    // Return a placeholder message encouraging manual text input
    const fallbackText = `[OCR Service Unavailable]

This appears to be an uploaded image file. The Google Vision API is not currently configured, so automatic text extraction is not available.

To use this service properly, please:
1. Set up a Google Cloud Project
2. Enable the Vision API
3. Create a service account and download the credentials JSON file
4. Set the GOOGLE_CLOUD_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS environment variables

For now, you can manually type the content from your image in the prompt field to get AI analysis.

Image file: ${imagePath.split('/').pop()}`;

    return {
      success: true,
      extractedText: fallbackText,
      rawText: fallbackText,
      confidence: 0.0
    };
  }
}

module.exports = new GoogleVisionService();