const axios = require('axios');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  async searchVideos(keywords, maxResults = 10) {
    try {
      // Create search query from keywords
      const searchQuery = Array.isArray(keywords) ? keywords.join(' ') : keywords;

      // Search for videos
      const searchResponse = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          maxResults: maxResults,
          order: 'relevance',
          key: this.apiKey,
          safeSearch: 'moderate',
          relevanceLanguage: 'en'
        }
      });

      const videos = searchResponse.data.items;

      if (!videos || videos.length === 0) {
        return {
          success: true,
          videos: []
        };
      }

      // Get video statistics for view counts
      const videoIds = videos.map(video => video.id.videoId).join(',');
      const statisticsResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'statistics',
          id: videoIds,
          key: this.apiKey
        }
      });

      const statisticsData = statisticsResponse.data.items;

      // Combine video data with statistics
      const videosWithStats = videos.map(video => {
        const stats = statisticsData.find(stat => stat.id === video.id.videoId);
        const viewCount = stats ? parseInt(stats.statistics.viewCount) : 0;

        return {
          title: video.snippet.title,
          videoId: video.id.videoId,
          channelTitle: video.snippet.channelTitle,
          viewCount: viewCount,
          publishedAt: new Date(video.snippet.publishedAt),
          thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
          description: video.snippet.description,
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`
        };
      });

      // Sort by view count (descending)
      videosWithStats.sort((a, b) => b.viewCount - a.viewCount);

      return {
        success: true,
        videos: videosWithStats
      };

    } catch (error) {
      console.error('YouTube API error:', error.response?.data || error.message);

      // Return fallback videos if API fails
      return {
        success: false,
        videos: this.getFallbackVideos(keywords),
        error: 'YouTube API temporarily unavailable'
      };
    }
  }

  async getEducationalVideos(keywords, subject = '') {
    try {
      // Enhanced search for educational content
      const educationalKeywords = Array.isArray(keywords) ? keywords.join(' ') : keywords;
      const searchQuery = `${educationalKeywords} ${subject} tutorial lesson education explained`.trim();

      const searchResponse = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          maxResults: 15,
          order: 'relevance',
          key: this.apiKey,
          safeSearch: 'strict',
          relevanceLanguage: 'en',
          videoDuration: 'medium', // Prefer medium length videos
          videoDefinition: 'any'
        }
      });

      const videos = searchResponse.data.items;

      // Filter for educational channels and content
      const educationalVideos = videos.filter(video => {
        const title = video.snippet.title.toLowerCase();
        const channelTitle = video.snippet.channelTitle.toLowerCase();
        const description = video.snippet.description.toLowerCase();

        // Look for educational indicators
        const educationalIndicators = [
          'tutorial', 'lesson', 'explained', 'learn', 'education',
          'academy', 'university', 'school', 'course', 'guide'
        ];

        return educationalIndicators.some(indicator =>
          title.includes(indicator) ||
          channelTitle.includes(indicator) ||
          description.includes(indicator)
        );
      });

      // Get statistics for the filtered videos
      const videoIds = educationalVideos.map(video => video.id.videoId).join(',');

      if (!videoIds) {
        return {
          success: true,
          videos: []
        };
      }

      const statisticsResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'statistics,contentDetails',
          id: videoIds,
          key: this.apiKey
        }
      });

      const statisticsData = statisticsResponse.data.items;

      // Process videos with statistics
      const processedVideos = educationalVideos.map(video => {
        const stats = statisticsData.find(stat => stat.id === video.id.videoId);
        const viewCount = stats ? parseInt(stats.statistics.viewCount || '0') : 0;
        const likeCount = stats ? parseInt(stats.statistics.likeCount || '0') : 0;
        const duration = stats ? stats.contentDetails.duration : '';

        return {
          title: video.snippet.title,
          videoId: video.id.videoId,
          channelTitle: video.snippet.channelTitle,
          viewCount: viewCount,
          likeCount: likeCount,
          publishedAt: new Date(video.snippet.publishedAt),
          thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
          description: video.snippet.description.substring(0, 150),
          duration: this.parseDuration(duration),
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`
        };
      });

      // Sort by view count and educational relevance
      processedVideos.sort((a, b) => {
        const scoreA = this.calculateEducationalScore(a);
        const scoreB = this.calculateEducationalScore(b);
        return scoreB - scoreA;
      });

      return {
        success: true,
        videos: processedVideos.slice(0, 8) // Return top 8 videos
      };

    } catch (error) {
      console.error('Educational videos search error:', error);
      return await this.searchVideos(keywords, 8);
    }
  }

  calculateEducationalScore(video) {
    let score = 0;

    // Base score from view count (normalized)
    score += Math.min(video.viewCount / 10000, 100);

    // Bonus for educational keywords in title
    const educationalKeywords = ['tutorial', 'lesson', 'explained', 'learn', 'how to', 'guide'];
    const titleLower = video.title.toLowerCase();
    educationalKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) {
        score += 20;
      }
    });

    // Bonus for educational channels
    const channelLower = video.channelTitle.toLowerCase();
    if (channelLower.includes('academy') || channelLower.includes('education') ||
        channelLower.includes('university') || channelLower.includes('school')) {
      score += 30;
    }

    return score;
  }

  parseDuration(duration) {
    if (!duration) return 'Unknown';

    // Parse ISO 8601 duration format (PT4M13S)
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 'Unknown';

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    let result = '';
    if (hours) result += `${hours}h `;
    if (minutes) result += `${minutes}m `;
    if (seconds) result += `${seconds}s`;

    return result.trim() || 'Unknown';
  }

  getFallbackVideos(keywords) {
    // Fallback videos when API is not available
    const searchTerm = Array.isArray(keywords) ? keywords[0] : keywords;

    return [{
      title: `Learn about ${searchTerm}`,
      videoId: 'fallback',
      channelTitle: 'Educational Content',
      viewCount: 0,
      publishedAt: new Date(),
      thumbnailUrl: '',
      description: 'YouTube API temporarily unavailable',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`,
      embedUrl: ''
    }];
  }
}

module.exports = new YouTubeService();