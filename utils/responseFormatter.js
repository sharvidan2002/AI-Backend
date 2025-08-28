/**
 * Standard response formatter for consistent API responses
 */
class ResponseFormatter {
  /**
   * Format API response
   * @param {boolean} success - Whether the operation was successful
   * @param {string} message - Response message
   * @param {Object|Array} data - Response data (optional)
   * @param {string} error - Error message (optional)
   * @returns {Object} Formatted response object
   */
  formatResponse(success, message, data = null, error = null) {
    const response = {
      success,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    if (error !== null && !success) {
      response.error = error;
    }

    return response;
  }

  /**
   * Format success response
   * @param {string} message - Success message
   * @param {Object|Array} data - Response data
   * @returns {Object} Formatted success response
   */
  success(message, data = null) {
    return this.formatResponse(true, message, data);
  }

  /**
   * Format error response
   * @param {string} message - Error message
   * @param {string} error - Detailed error information
   * @returns {Object} Formatted error response
   */
  error(message, error = null) {
    return this.formatResponse(false, message, null, error);
  }

  /**
   * Format validation error response
   * @param {Object|Array} validationErrors - Validation error details
   * @returns {Object} Formatted validation error response
   */
  validationError(validationErrors) {
    return this.formatResponse(
      false,
      'Validation failed',
      null,
      {
        type: 'validation_error',
        details: validationErrors
      }
    );
  }

  /**
   * Format paginated response
   * @param {string} message - Response message
   * @param {Array} items - Array of items
   * @param {Object} pagination - Pagination metadata
   * @returns {Object} Formatted paginated response
   */
  paginated(message, items, pagination) {
    return this.formatResponse(true, message, {
      items,
      pagination
    });
  }

  /**
   * Format file upload response
   * @param {string} message - Response message
   * @param {Object} fileInfo - Uploaded file information
   * @returns {Object} Formatted upload response
   */
  fileUpload(message, fileInfo) {
    return this.formatResponse(true, message, {
      file: {
        filename: fileInfo.filename,
        originalName: fileInfo.originalname,
        size: fileInfo.size,
        mimetype: fileInfo.mimetype,
        path: fileInfo.path
      }
    });
  }

  /**
   * Format analysis response
   * @param {string} message - Response message
   * @param {Object} analysisData - Analysis results
   * @returns {Object} Formatted analysis response
   */
  analysis(message, analysisData) {
    return this.formatResponse(true, message, {
      analysis: analysisData,
      processedAt: new Date().toISOString()
    });
  }

  /**
   * Format chat response
   * @param {string} message - Response message
   * @param {Object} chatData - Chat data
   * @returns {Object} Formatted chat response
   */
  chat(message, chatData) {
    return this.formatResponse(true, message, {
      chat: chatData,
      responseAt: new Date().toISOString()
    });
  }
}

const responseFormatter = new ResponseFormatter();

module.exports = {
  formatResponse: responseFormatter.formatResponse.bind(responseFormatter),
  success: responseFormatter.success.bind(responseFormatter),
  error: responseFormatter.error.bind(responseFormatter),
  validationError: responseFormatter.validationError.bind(responseFormatter),
  paginated: responseFormatter.paginated.bind(responseFormatter),
  fileUpload: responseFormatter.fileUpload.bind(responseFormatter),
  analysis: responseFormatter.analysis.bind(responseFormatter),
  chat: responseFormatter.chat.bind(responseFormatter)
};