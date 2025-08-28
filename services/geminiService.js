const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }

      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // Configure the model with appropriate settings
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      this.isConfigured = true;
      console.log('Gemini AI initialized successfully with gemini-2.0-flash-exp');
    } catch (error) {
      console.error('Gemini AI initialization error:', error.message);
      this.isConfigured = false;
      this.model = null;
    }
  }

  async analyzeContent(extractedText, userPrompt) {
    if (!this.isConfigured) {
      console.warn('Gemini AI not configured, using fallback analysis');
      return this.fallbackAnalysis(extractedText, userPrompt);
    }

    try {
      const prompt = this.buildAnalysisPrompt(extractedText, userPrompt);

      const result = await this.model.generateContent({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      });

      const response = await result.response;
      const text = response.text();

      return this.parseAnalysisResponse(text);
    } catch (error) {
      console.error('Gemini analysis error:', error);
      console.warn('Falling back to basic analysis');
      return this.fallbackAnalysis(extractedText, userPrompt);
    }
  }

  buildAnalysisPrompt(extractedText, userPrompt) {
    return `You are an expert educational AI assistant. Analyze the following text and provide a comprehensive educational response.

USER REQUEST: "${userPrompt}"

CONTENT TO ANALYZE:
"${extractedText}"

IMPORTANT: Your response must be valid JSON format exactly as shown below. Do not include any text before or after the JSON.

{
  "summary": "Write a clear 2-3 sentence summary of the main content that directly addresses the user's request",
  "explanation": "Provide a detailed explanation of key concepts in simple, student-friendly language. Break down complex topics into understandable parts.",
  "keyPoints": ["List 4-6 of the most important facts, concepts, or takeaways from this content", "Each point should be specific and actionable for studying", "Focus on what students need to remember"],
  "concepts": ["List the main academic concepts, topics, or subject areas covered", "Use proper academic terminology", "Include 3-5 key concepts"],
  "searchKeywords": ["Provide 4-5 specific keywords that would help find educational videos about this topic", "Use terms that teachers and educators would search for", "Include both general and specific terms"]
}

Ensure your JSON is properly formatted and complete. Focus on educational value and student comprehension.`;
  }

  async generateQuizQuestions(extractedText, userPrompt) {
    if (!this.isConfigured) {
      console.warn('Gemini AI not configured, using fallback quiz');
      return this.fallbackQuizGeneration(extractedText, userPrompt);
    }

    try {
      const prompt = this.buildQuizPrompt(extractedText, userPrompt);

      const result = await this.model.generateContent({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      });

      const response = await result.response;
      const text = response.text();

      return this.parseQuizResponse(text);
    } catch (error) {
      console.error('Quiz generation error:', error);
      console.warn('Falling back to basic quiz questions');
      return this.fallbackQuizGeneration(extractedText, userPrompt);
    }
  }

  buildQuizPrompt(extractedText, userPrompt) {
    return `You are an expert educational quiz creator. Generate high-quality quiz questions based on the provided content.

USER REQUEST: "${userPrompt}"

STUDY CONTENT:
"${extractedText}"

Create a variety of quiz questions that test different aspects of understanding. Your response must be valid JSON format exactly as shown below:

{
  "questions": [
    {
      "type": "mcq",
      "question": "Clear, specific multiple choice question that tests understanding",
      "options": ["Correct answer", "Plausible distractor", "Another distractor", "Final distractor"],
      "correctAnswer": "Correct answer",
      "explanation": "Brief explanation of why this answer is correct and why others are wrong"
    },
    {
      "type": "short_answer",
      "question": "Open-ended question that requires explanation or analysis",
      "correctAnswer": "Expected comprehensive answer based on the content",
      "explanation": "Additional context or guidance for the answer"
    },
    {
      "type": "flashcard",
      "question": "Key term, concept, or question for front of flashcard",
      "correctAnswer": "Definition, explanation, or answer for back of flashcard",
      "explanation": "Why this concept is important to remember"
    }
  ]
}

REQUIREMENTS:
- Generate 6-8 questions total with a good mix of types (2-3 MCQ, 2-3 short answer, 2-3 flashcards)
- Questions should test different cognitive levels (recall, understanding, application)
- Make MCQ distractors plausible but clearly wrong
- Ensure all questions are directly answerable from the provided content
- Focus on the most important concepts for student learning

Your response must be valid JSON only, no additional text.`;
  }

  async answerQuestion(question, documentContent, chatHistory = []) {
    if (!this.isConfigured) {
      return {
        success: true,
        answer: "I apologize, but the AI analysis service is not currently configured. Please set up the GEMINI_API_KEY environment variable to enable AI-powered chat functionality."
      };
    }

    try {
      const prompt = this.buildChatPrompt(question, documentContent, chatHistory);

      const result = await this.model.generateContent({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      });

      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        answer: text.trim()
      };
    } catch (error) {
      console.error('Chat response error:', error);
      return {
        success: true,
        answer: "I'm sorry, I'm having trouble processing your question right now. Please try again or rephrase your question."
      };
    }
  }

  buildChatPrompt(question, documentContent, chatHistory) {
    let historyContext = '';
    if (chatHistory.length > 0) {
      historyContext = '\nPREVIOUS CONVERSATION:\n';
      chatHistory.slice(-5).forEach(msg => {
        historyContext += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
      historyContext += '\n';
    }

    return `You are a helpful AI tutor specialized in explaining study materials. Your role is to help students understand their uploaded content better.

DOCUMENT CONTENT:
"${documentContent}"
${historyContext}
STUDENT QUESTION: "${question}"

INSTRUCTIONS:
- Answer based ONLY on the provided document content
- If the question cannot be answered from the document, politely explain this limitation
- Provide clear, educational explanations appropriate for a student
- Use examples from the document when possible
- If asked about topics not in the document, redirect to what you can help with
- Keep responses focused and helpful for learning
- Be encouraging and supportive in your teaching style

Provide your response now:`;
  }

  parseAnalysisResponse(text) {
    try {
      // Clean the response text
      let cleanText = text.trim();

      // Remove any markdown code blocks if present
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Try to extract JSON from the response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Validate required fields
        const analysis = {
          summary: parsed.summary || 'Content analysis completed.',
          explanation: parsed.explanation || 'Analysis provided based on the uploaded content.',
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['Analysis completed successfully'],
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : ['Study material analysis'],
          searchKeywords: Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords : ['study', 'education', 'learning']
        };

        return {
          success: true,
          analysis: analysis
        };
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      console.error('JSON parsing error:', error.message);
      console.log('Raw response:', text.substring(0, 200) + '...');

      // Enhanced fallback parsing
      return {
        success: true,
        analysis: {
          summary: this.extractSection(text, 'summary') || 'AI analysis completed based on your uploaded content.',
          explanation: this.extractSection(text, 'explanation') || text.substring(0, 500) + '...',
          keyPoints: this.extractArraySection(text, 'keyPoints') || ['Content has been analyzed', 'Key information extracted', 'Study material processed'],
          concepts: this.extractArraySection(text, 'concepts') || ['Study Material', 'Educational Content'],
          searchKeywords: this.extractArraySection(text, 'searchKeywords') || ['study', 'education', 'learning', 'tutorial']
        }
      };
    }
  }

  parseQuizResponse(text) {
    try {
      // Clean the response text
      let cleanText = text.trim();

      // Remove any markdown code blocks if present
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Validate and clean questions
        const questions = Array.isArray(parsed.questions) ? parsed.questions.filter(q => {
          return q.question && q.correctAnswer && q.type;
        }).map(q => ({
          type: q.type,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'No explanation provided'
        })) : [];

        return {
          success: true,
          questions: questions
        };
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      console.error('Quiz JSON parsing error:', error.message);
      console.log('Raw quiz response:', text.substring(0, 200) + '...');

      // Enhanced fallback with basic questions
      return {
        success: true,
        questions: [
          {
            type: 'short_answer',
            question: 'What are the main topics covered in this study material?',
            correctAnswer: 'Based on the uploaded content, identify and explain the key topics and concepts.',
            explanation: 'This question helps review the overall content and main themes.'
          },
          {
            type: 'flashcard',
            question: 'Key Concept Review',
            correctAnswer: 'Review and memorize the most important points from your study material',
            explanation: 'Use this to test your memory of crucial information.'
          },
          {
            type: 'mcq',
            question: 'Which of these best describes your study material?',
            options: ['Educational content requiring analysis', 'Random text', 'Non-academic material', 'Empty document'],
            correctAnswer: 'Educational content requiring analysis',
            explanation: 'Your uploaded material appears to contain educational content suitable for study.'
          }
        ]
      };
    }
  }

  // Helper method to extract array sections from text
  extractArraySection(text, sectionName) {
    try {
      const regex = new RegExp(`"${sectionName}"[\\s]*:[\\s]*\\[([^\\]]+)\\]`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        // Parse the array content
        const arrayContent = match[1];
        const items = arrayContent.split(',').map(item =>
          item.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
        ).filter(item => item.length > 0);
        return items;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractSection(text, sectionName) {
    const regex = new RegExp(`"${sectionName}"[\\s]*:[\\s]*"([^"]*)"`, 'i');
    const match = text.match(regex);
    return match ? match[1] : null;
  }

  // Fallback methods when Gemini AI is not available
  fallbackAnalysis(extractedText, userPrompt) {
    console.log('Using fallback analysis for text length:', extractedText.length);

    // Basic text analysis
    const wordCount = extractedText.split(/\s+/).length;
    const sentences = extractedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentences = sentences.slice(0, 3).join('. ') + '.';

    return {
      success: true,
      analysis: {
        summary: `This document contains approximately ${wordCount} words. ${firstSentences}`,
        explanation: `This appears to be study material related to: ${userPrompt}. The content covers various topics that would benefit from AI analysis. Please configure the GEMINI_API_KEY to get detailed AI-powered analysis.`,
        keyPoints: [
          "Content extracted from uploaded image",
          `Document contains ${wordCount} words`,
          "AI analysis requires Gemini API configuration",
          "Manual review recommended for detailed understanding"
        ],
        concepts: [
          "Study Material",
          "Content Analysis",
          "Educational Content"
        ],
        searchKeywords: ["study", "education", "learning", "tutorial", "explanation"]
      }
    };
  }

  fallbackQuizGeneration(extractedText, userPrompt) {
    console.log('Using fallback quiz generation');

    return {
      success: true,
      questions: [
        {
          type: 'short_answer',
          question: 'What are the main topics covered in this study material?',
          correctAnswer: 'Based on the uploaded content and the user request: ' + userPrompt,
          explanation: 'This question helps identify key themes and concepts from the material.'
        },
        {
          type: 'flashcard',
          question: 'Key Concept Review',
          correctAnswer: 'Review the main points from your uploaded study material',
          explanation: 'Use this flashcard to test your memory of important concepts.'
        },
        {
          type: 'mcq',
          question: 'What type of analysis was requested for this material?',
          options: [userPrompt, 'Mathematical calculation', 'Language translation', 'Image editing'],
          correctAnswer: userPrompt,
          explanation: 'This question relates to your specific request for content analysis.'
        }
      ]
    };
  }
}

module.exports = new GeminiService();