const express = require('express');
const router = express.Router();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const { callDeepSeekAPI, callGeminiAPI } = require('../services/aiService');
const { parseTweetsJS, processTweetData } = require('../utils/tweetProcessor');
const logger = require('../utils/logger');
const multer = require('multer');
const sessionManager = require('../utils/sessionManager');

const upload = multer();

/**
 * Data validation middleware
 */
const validateAnalysisRequest = [
  body('tweetsJsContent').notEmpty().isString().withMessage('tweetsJsContent is required'),
  body('analysisType').notEmpty().withMessage('analysisType is required'),
  body('isPaid').isBoolean().withMessage('isPaid must be a boolean'),
  body('timeframe').optional().isString().withMessage('timeframe must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Analysis request validation failed', { errors: errors.array(), ip: req.ip, path: req.path });
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }
    next();
  }
];

/**
 * Generic analysis endpoint handler
 * @param {string} analysisType - Type of analysis to perform
 * @param {Function} generatePrompt - Function to generate the prompt
 * @param {Object} options - Additional options
 */
const analysisHandler = (analysisType, generatePrompt, options = {}) => async (req, res) => {
  try {
    const { tweetsJsContent, isPaid = false, timeframe = 'all', imageUrl, tweetText } = req.body;
    logger.info(`Received ${analysisType} analysis request`, { isPaid, timeframe });

    let parsedData;
    try {
      parsedData = parseTweetsJS(tweetsJsContent);
      logger.debug(`Parsed ${parsedData.length} raw tweet items for ${analysisType}`);
    } catch (parseError) {
      logger.error(`Error parsing tweetsJsContent for ${analysisType}: ${parseError.message}`);
      return res.status(400).json({ status: 'error', message: 'Invalid tweets.js content', error: process.env.NODE_ENV === 'development' ? parseError.message : undefined });
    }

    let processedData;
    try {
      processedData = processTweetData(parsedData, timeframe, isPaid);
      logger.debug(`Processed ${processedData.allTweets.length} tweets for ${analysisType}`);
    } catch (processingError) {
      logger.error(`Error processing tweet data for ${analysisType}: ${processingError.message}`);
      return res.status(500).json({ status: 'error', message: 'Failed to process tweet data', error: process.env.NODE_ENV === 'development' ? processingError.message : undefined });
    }

    if (!isPaid && options.requiresPremium) {
      const upgradeMessage = options.getUpgradeMessage ? options.getUpgradeMessage(analysisType) : '<p>Upgrade required</p>';
      return res.json({ status: 'success', analysis: upgradeMessage, requiresUpgrade: true });
    }

    const prompt = generatePrompt(processedData, isPaid, timeframe, imageUrl, tweetText);
    const maxTokens = options.maxTokens || 1000;
    const startTime = Date.now();
    let analysisResult;

    if (options.useGemini) {
      if (!imageUrl) throw new Error('Image URL is required for Gemini analysis.');
      analysisResult = await callGeminiAPI(prompt, imageUrl);
    } else {
      analysisResult = await callDeepSeekAPI(prompt, maxTokens);
    }

    logger.info(`AI API call for ${analysisType} completed in ${Date.now() - startTime}ms`);
    res.json({ status: 'success', analysis: analysisResult });
  } catch (error) {
    logger.error(`Error in ${analysisType} handler: ${error.message}`, { stack: error.stack });
    let statusCode = 500;
    let message = `Failed to generate ${analysisType} analysis. Please try again later.`;

    if (error.response) {
      if (error.response.status === 429) {
        statusCode = 429;
        message = 'AI service rate limit exceeded. Please try again shortly.';
      } else if ([401,403].includes(error.response.status)) {
        statusCode = 503;
        message = 'AI service authentication failed. Please contact support.';
      }
    } else if (error.message.includes('timed out')) {
      statusCode = 504;
      message = 'AI service request timed out. Please try again later.';
    } else if (error.message.includes('Invalid tweets.js') || error.message.includes('Failed to process tweet data')) {
      statusCode = 400;
      message = error.message;
    }

    res.status(statusCode).json({ status: 'error', message, error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

/**
 * Get upgrade message for free tier users
 * @param {string} sectionTitle - Title of the section
 * @param {string} description - Description of the premium feature
 * @param {string} buttonId - ID for the upgrade button
 */
function getUpgradeMessageHTML(sectionTitle, description, buttonId = 'upgradeButton') {
  return `
    <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm text-center premium-content-locked">
      <h4 class="text-lg font-semibold text-blue-800 mb-2">${sectionTitle} Locked</h4>
      <p class="text-gray-700 text-sm mb-4">${description}</p>
      <button id="${buttonId}" class="cta-button inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg text-sm shadow-md upgrade-button">
        Unlock Full Report ($9)
      </button>
      <p class="text-xs text-gray-500 mt-2">Requires upgrading to the full analysis.</p>
    </div>`;
}

/**
 * Get descriptions for premium upgrade messages
 */
const premiumDescriptions = {
  topicAnalysis: 'Unlock detailed topic analysis to understand which subjects drive the most discussion and engagement. See patterns based on your full tweet history.',
  engagementAnalysis: 'Upgrade to analyze engagement dynamics across your entire tweet history. See detailed breakdowns of what drives likes, retweets, and conversations.',
  mediaAnalysis: 'Upgrade to analyze how images and videos impact engagement across your full tweet history. See which media types perform best.',
  contentRecommendations: 'Upgrade to receive a comprehensive overview of content strategy recommendations tailored to your full Twitter history.',
  monthlyAnalysis: 'Upgrade to unlock a summary analyzing how your activity volume and engagement trends have evolved month-over-month based on your full history.',
  imageAnalysis: 'Upgrade to unlock AI-powered analysis of your images, understanding visual themes and their relation to tweet text and engagement.'
};

/**
 * Check if analysis type requires premium
 */
const isPremiumOnly = (type) => {
  const premiumTypes = ['topicAnalysis', 'engagementAnalysis', 'mediaAnalysis', 'contentRecommendations', 'monthlyAnalysis', 'imageAnalysis'];
  return premiumTypes.includes(type);
};

/**
 * @route POST /api/analyze/executive-summary
 * @desc Generate executive summary for Twitter data
 */
router.post('/executive-summary', validateAnalysisRequest, analysisHandler(
  'Executive Summary',
  (processedData, isPaid, timeframe) => {
    const tweetStats = {
      totalTweetsAnalyzed: processedData.allTweets.length,
      totalArchiveTweets: !isPaid
        ? (processedData._rawTweetCountInTimeframe > processedData._processedTweetCount
            ? `Latest ${processedData._processedTweetCount} of ${processedData._rawTweetCountInTimeframe}`
            : `All ${processedData._processedTweetCount}`)
        : `All ${processedData._processedTweetCount}`,
      originalTweets: processedData.originalTweets.length,
      replies: processedData.replies.length,
      totalLikes: processedData.allTweets.reduce((sum, t) => sum + parseInt(t.favorite_count || 0), 0),
      totalRetweets: processedData.allTweets.reduce((sum, t) => sum + parseInt(t.retweet_count || 0), 0),
      mostActiveHour: processedData.temporalData.hourlyActivity.indexOf(Math.max(...processedData.temporalData.hourlyActivity)),
      mostActiveDay: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][
        processedData.temporalData.dailyActivity.indexOf(Math.max(...processedData.temporalData.dailyActivity))
      ]
    };
    const tfText = timeframe === 'all' ? 'entire Twitter archive' : `last ${timeframe.replace('last-','')}`;
    const limitedNote = processedData._isFreeTierLimited
      ? `NOTE: Limited to latest ${processedData._processedTweetCount} tweets${timeframe==='all'?'':' within this timeframe'}. Full analysis available after upgrade.`
      : `This is a full analysis of the ${tfText}.`;
    return `Analyze this Twitter data and provide an executive summary for the ${tfText}. ${limitedNote}

Tweet Stats: ${JSON.stringify(tweetStats, null,2)}

Sample Tweets (up to 50): ${JSON.stringify(processedData.allTweets.slice(0,50).map(t=>t.full_text||t.text), null,2)}

Format as HTML, 3-4 short <p> blocks with key insights. ${processedData._isFreeTierLimited?'Clarify that patterns may differ with more data.':''}`;
  }
));

/**
 * @route POST /api/analyze/activity
 * @desc Generate activity analysis for Twitter data
 */
router.post('/activity', validateAnalysisRequest, analysisHandler(
  'activityAnalysis',
  (data, isPaid, timeframe) => {
    const activityData = {
      hourlyActivity: data.temporalData?.hourlyActivity || [],
      dailyActivity: data.temporalData?.dailyActivity || [],
      monthlyActivity: Object.entries(data.temporalData?.monthlyActivity || {}),
      totalTweetsAnalyzed: data.allTweets.length,
      originalTweets: data.originalTweets?.length || 0,
      replies: data.replies?.length || 0,
      avgHourlyEngagement: data.temporalData?.avgHourlyEngagement || [],
      hourlyTweetCount: data.temporalData?.hourlyTweetCount || [],
      avgDailyEngagement: data.temporalData?.avgDailyEngagement || [],
      dailyTweetCount: data.temporalData?.dailyTweetCount || []
    };
    
    const tfText = timeframe === 'all' ? 'entire archive' : `last ${timeframe} days`;
    
    return `
      Analyze this Twitter activity/engagement timing data for the ${tfText}.
      ${!isPaid ? `NOTE: Based on latest 100 tweets${timeframe === 'all' ? '' : ' in this period'}.` : ''}

      Activity & Engagement Timing Data:
      Total Tweets Analyzed: ${activityData.totalTweetsAnalyzed}
      Original Tweets: ${activityData.originalTweets}
      Replies: ${activityData.replies}
      Avg Engagement / Hour: ${JSON.stringify(activityData.avgHourlyEngagement.map(n => n.toFixed(2)), null, 2)}
      Tweet Count / Hour: ${JSON.stringify(activityData.hourlyTweetCount, null, 2)}
      Avg Engagement / Day: ${JSON.stringify(activityData.avgDailyEngagement.map(n => n.toFixed(2)), null, 2)}
      Tweet Count / Day: ${JSON.stringify(activityData.dailyTweetCount, null, 2)}
      Monthly Activity: ${JSON.stringify(activityData.monthlyActivity, null, 2)}

      Provide 3 short <p> insights highlighting best times for engagement for this timeframe only. Do NOT add titles.
      ${!isPaid ? 'Mention limited data caveat.' : ''}
    `;
  }
));

/**
 * @route POST /api/analyze/topic
 * @desc Generate topic analysis for Twitter data
 */
router.post('/topic', validateAnalysisRequest, analysisHandler(
  'topicAnalysis',
  (data, isPaid, timeframe) => {
    // Use all original tweets for paid users
    const tweetSample = data.originalTweets?.slice(0, 100) || []; // Sample for topics
    
    return `
      Analyze these tweets and identify the main topics discussed based purely on the text content. For each topic, provide an analysis of frequency and potential engagement trends if discernible from the sample.

      Sample Original Tweets (up to 100):
      ${JSON.stringify(tweetSample.map(t => t.full_text || t.text), null, 2)}

      Format your response as HTML with 3-4 concise paragraphs (use <p> tags).
      Identify 3-5 main topics from the content and discuss their apparent patterns based on the provided sample.
      Do NOT include headings or titles in your response.
    `;
  },
  {
    requiresPremium: true,
    getUpgradeMessage: (type) => getUpgradeMessageHTML('Topic Analysis', premiumDescriptions.topicAnalysis, 'upgradeTopicsBtn')
  }
));

/**
 * @route POST /api/analyze/engagement
 * @desc Generate engagement analysis for Twitter data
 */
router.post('/engagement', validateAnalysisRequest, analysisHandler(
  'engagementAnalysis',
  (data, isPaid, timeframe) => {
    // Use all tweets for paid users
    const topTweets = [...data.allTweets]
      .sort((a, b) => {
        const engagementA = parseInt(a.favorite_count || 0) + parseInt(a.retweet_count || 0);
        const engagementB = parseInt(b.favorite_count || 0) + parseInt(b.retweet_count || 0);
        return engagementB - engagementA;
      })
      .slice(0, 10);
    
    // Calculate averages
    const avgOriginalEngagement = data.originalTweets?.length ? 
      data.originalTweets.reduce((sum, tweet) => sum + parseInt(tweet.favorite_count || 0) + parseInt(tweet.retweet_count || 0), 0) / data.originalTweets.length : 0;
    
    const avgReplyEngagement = data.replies?.length ?
      data.replies.reduce((sum, tweet) => sum + parseInt(tweet.favorite_count || 0) + parseInt(tweet.retweet_count || 0), 0) / data.replies.length : 0;
    
    const engagementData = {
      topTweets: topTweets.map(t => ({
        text: (t.full_text || t.text).substring(0, 150), // Keep text snippet reasonable
        likes: parseInt(t.favorite_count || 0),
        retweets: parseInt(t.retweet_count || 0),
        total: parseInt(t.favorite_count || 0) + parseInt(t.retweet_count || 0)
      })),
      avgOriginalEngagement,
      avgReplyEngagement,
      avgHourlyEngagement: data.temporalData?.avgHourlyEngagement || [],
      hourlyTweetCount: data.temporalData?.hourlyTweetCount || [],
      avgDailyEngagement: data.temporalData?.avgDailyEngagement || [],
      dailyTweetCount: data.temporalData?.dailyTweetCount || []
    };
    
    return `
      Analyze this Twitter engagement data, focusing on what drives interactions and WHEN engagement typically occurs.

      Engagement Data:
      Top Performing Tweets (by Likes + Retweets): ${JSON.stringify(engagementData.topTweets, null, 2)}
      Total Original Tweets: ${data.originalTweets?.length || 0}
      Total Replies: ${data.replies?.length || 0}
      Average Engagement for Original Tweets: ${engagementData.avgOriginalEngagement.toFixed(2)}
      Average Engagement for Replies: ${engagementData.avgReplyEngagement.toFixed(2)}
      Average Engagement per Hour (0-23): ${JSON.stringify(engagementData.avgHourlyEngagement.map(n => n.toFixed(2)), null, 2)}
      Tweet Count per Hour (0-23): ${JSON.stringify(engagementData.hourlyTweetCount, null, 2)}
      Average Engagement per Day (Sun=0 to Sat=6): ${JSON.stringify(engagementData.avgDailyEngagement.map(n => n.toFixed(2)), null, 2)}
      Tweet Count per Day (Sun=0 to Sat=6): ${JSON.stringify(engagementData.dailyTweetCount, null, 2)}

      Format your response as HTML with 3-4 concise paragraphs (use <p> tags).
      1. Analyze factors driving engagement (content of top tweets).
      2. Critically compare the engagement dynamics of original tweets versus replies. Consider overall *impact* based on volume and average engagement.
      3. Critically analyze the optimal TIMES (hour, day) for posting based on the provided average engagement data, considering tweet counts for context.
      4. Identify characteristics of high-performing content based on the top tweets.
      Do NOT include headings or titles in your response.
    `;
  },
  {
    requiresPremium: true,
    getUpgradeMessage: (type) => getUpgradeMessageHTML('Engagement Analysis', premiumDescriptions.engagementAnalysis, 'upgradeEngagementBtn')
  }
));

/**
 * @route POST /api/analyze/media
 * @desc Generate media analysis for Twitter data
 */
router.post('/media', validateAnalysisRequest, analysisHandler(
  'mediaAnalysis',
  (data, isPaid, timeframe) => {
    // If no media items, return early with message
    if (!data.mediaItems || data.mediaItems.length === 0) {
      return `<p class="text-gray-600 italic text-center">No media content found in your tweets.</p>`;
    }
    
    // Calculate media engagement metrics
    const mediaEngagement = data.mediaItems.map(item => ({
      type: item.type,
      engagement: (item.engagement?.likes || 0) + (item.engagement?.retweets || 0)
    }));
    
    const mediaTypeCount = {};
    data.mediaItems.forEach(item => {
      mediaTypeCount[item.type] = (mediaTypeCount[item.type] || 0) + 1;
    });
    
    // Calculate average engagement for tweets with and without media
    const tweetsWithMediaIds = new Set(data.mediaItems.map(item => item.tweetId));
    let totalMediaEngagement = 0;
    let totalNonMediaEngagement = 0;
    let mediaTweetCount = 0;
    let nonMediaTweetCount = 0;
    
    data.allTweets.forEach(tweet => {
      const engagement = (parseInt(tweet.favorite_count || 0) + parseInt(tweet.retweet_count || 0));
      if (tweetsWithMediaIds.has(tweet.id_str)) {
        totalMediaEngagement += engagement;
        mediaTweetCount++;
      } else {
        totalNonMediaEngagement += engagement;
        nonMediaTweetCount++;
      }
    });
    
    const avgMediaEngagement = mediaTweetCount > 0 ? totalMediaEngagement / mediaTweetCount : 0;
    const avgNonMediaEngagement = nonMediaTweetCount > 0 ? totalNonMediaEngagement / nonMediaTweetCount : 0;
    
    const mediaData = {
      totalMediaItems: data.mediaItems.length,
      mediaTypeDistribution: mediaTypeCount,
      averageEngagementPerMediaTweet: avgMediaEngagement,
      averageEngagementPerNonMediaTweet: avgNonMediaEngagement,
      totalTweets: data.allTweets.length,
      percentTweetsWithMedia: (mediaTweetCount / data.allTweets.length) * 100
    };
    
    return `
      Analyze this Twitter media data and provide insights about media usage and its impact on engagement.
      
      Media Data:
      ${JSON.stringify(mediaData, null, 2)}
      
      Format your response as HTML with 3-4 concise paragraphs (use <p> tags).
      Focus on:
      1. Media usage patterns (frequency, types used).
      2. Compare the average engagement of tweets with media vs. text-only tweets.
      3. Recommendations for leveraging media effectively based on the data.
      Do NOT include headings or titles in your response.
    `;
  },
  {
    requiresPremium: true,
    getUpgradeMessage: (type) => getUpgradeMessageHTML('Media Analysis', premiumDescriptions.mediaAnalysis, 'upgradeMediaBtn')
  }
));

/**
 * @route POST /api/analyze/monthly
 * @desc Generate monthly analysis for Twitter data
 */
router.post('/monthly', validateAnalysisRequest, analysisHandler(
  'monthlyAnalysis',
  (data, isPaid, timeframe) => {
    // Use full temporal data for paid users
    const monthlyActivity = data.temporalData?.monthlyActivity || {};
    const avgMonthlyEngagement = data.temporalData?.avgMonthlyEngagement || {};
    const monthlyTweetCount = data.temporalData?.monthlyTweetCount || {};

    const sortedMonths = Object.keys(monthlyActivity).sort();
    const monthlyDataForApi = sortedMonths.map(month => ({
      month: month,
      posts: monthlyActivity[month],
      avgEngagement: parseFloat((avgMonthlyEngagement[month] || 0).toFixed(2)),
      tweetCount: monthlyTweetCount[month] || 0
    }));

    return `
      Analyze the following monthly Twitter activity data. Focus specifically on the relationship and correlation between the volume of tweets posted each month and the average engagement received per tweet during that same month.

      Monthly Data (Posts = Tweet Volume, AvgEngagement = Likes+Retweets per Tweet):
      ${JSON.stringify(monthlyDataForApi, null, 2)}

      Format your response as HTML with 2-3 concise paragraphs (use <p> tags).
      1. Identify months with high/low posting volume and high/low average engagement.
      2. Discuss whether there appears to be a positive, negative, or no clear correlation between posting frequency and average engagement per tweet based on this data.
      3. Offer potential explanations for the observed trends (e.g., content quality changes, seasonal topics, audience availability).
      Do NOT include headings or titles in your response.
    `;
  },
  {
    requiresPremium: true,
    getUpgradeMessage: (type) => getUpgradeMessageHTML('Monthly Trends Summary', premiumDescriptions.monthlyAnalysis, 'upgradeMonthlyBtn')
  }
));

/**
 * @route POST /api/analyze/content-recommendations
 * @desc Generate content strategy recommendations
 */
router.post('/content-recommendations', validateAnalysisRequest, analysisHandler(
  'contentRecommendations',
  (data, isPaid, timeframe) => {
    const topTweets = [...data.allTweets]
      .sort((a, b) => {
        const engagementA = parseInt(a.favorite_count || 0) + parseInt(a.retweet_count || 0);
        const engagementB = parseInt(b.favorite_count || 0) + parseInt(b.retweet_count || 0);
        return engagementB - engagementA;
      })
      .slice(0, 10);
    
    const recommendationData = {
      tweetStats: {
        totalTweets: data.allTweets.length,
        originalTweets: data.originalTweets?.length || 0,
        replies: data.replies?.length || 0
      },
      topPerformingTweets: topTweets.map(t => ({
        text: (t.full_text || t.text).substring(0, 150),
        likes: parseInt(t.favorite_count || 0),
        retweets: parseInt(t.retweet_count || 0)
      })),
      temporalData: {
        mostActiveHour: data.temporalData?.hourlyActivity.indexOf(Math.max(...data.temporalData.hourlyActivity)),
        mostActiveDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          data.temporalData?.dailyActivity.indexOf(Math.max(...data.temporalData.dailyActivity))
        ],
        hourlyActivity: data.temporalData?.hourlyActivity || [],
        dailyActivity: data.temporalData?.dailyActivity || [],
        avgHourlyEngagement: data.temporalData?.avgHourlyEngagement || [],
        hourlyTweetCount: data.temporalData?.hourlyTweetCount || [],
        avgDailyEngagement: data.temporalData?.avgDailyEngagement || [],
        dailyTweetCount: data.temporalData?.dailyTweetCount || []
      }
    };
    
    return `
      Based on this Twitter data, provide specific content strategy recommendations.

      Twitter Data:
      ${JSON.stringify(recommendationData, null, 2)}

      Generate three distinct sections of recommendations. Format your entire response as HTML.

      Section 1: Start with the heading <h4>Engagement Optimization</h4> followed by 2-3 paragraphs (<p> tags) of actionable advice on optimizing engagement based on the data.

      Section 2: Start with the heading <h4>Topic & Timing Suggestions</h4> followed by 2-3 paragraphs (<p> tags). Suggest topics derived from top tweets and provide timing advice based *strictly* on hours/days with the highest *average engagement* (avgHourlyEngagement, avgDailyEngagement), using tweet counts (hourlyTweetCount, dailyTweetCount) and user activity peaks (mostActiveHour/Day, hourlyActivity/dailyActivity) for context.

      Section 3: Start with the heading <h4>Strategic Improvement Areas</h4> followed by 2-3 paragraphs (<p> tags) identifying broader areas for strategic improvement based on the overall data analysis.

      Use only <h4> for headings and <p> for paragraphs. Ensure recommendations are specific and actionable, directly tied to the provided data.
    `;
  },
  {
    requiresPremium: true,
    maxTokens: 1200,
    getUpgradeMessage: (type) => {
      // For content recommendations, we return multiple sections
      return {
        overview: getUpgradeMessageHTML('Content Strategy Overview', 
          'Upgrade to receive a comprehensive overview of content strategy recommendations tailored to your full Twitter history.', 
          'upgradeContentOverviewBtn'),
        optimization: getUpgradeMessageHTML('Engagement Optimization', 
          'Unlock specific tactics to optimize engagement based on your complete performance data.', 
          'upgradeEngagementOptBtn'),
        timing: getUpgradeMessageHTML('Topic & Timing Suggestions', 
          'Get detailed suggestions on the best topics and times to post for maximum impact, derived from your full archive.', 
          'upgradeTopicTimingBtn'),
        improvement: getUpgradeMessageHTML('Strategic Improvement Areas', 
          'Identify key areas for strategic improvement based on an analysis of all your tweets.', 
          'upgradeImprovementBtn')
      };
    }
  }
));

/**
 * @route POST /api/analyze/image
 * @desc Analyze images with Gemini API
 */
router.post('/image', [
  body('imageUrl').notEmpty().isURL().withMessage('Valid image URL is required'),
  body('tweetText').optional(),
  body('isPaid').isBoolean().withMessage('isPaid must be a boolean value'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }
    next();
  }
], analysisHandler(
  'imageAnalysis',
  (data, isPaid, timeframe, imageUrl, tweetText) => {
    // Prompt template for image analysis
    return `Analyze this image from a Twitter post. The tweet text associated with the image was: "${tweetText || ''}".
    Provide a concise analysis focusing on:
    1. A brief description of the main subject and visual elements.
    2. The overall theme or mood conveyed by the image.
    3. How the image likely relates to or enhances the tweet's text/message.
    4. Any notable features or potential reasons for engagement (if apparent).

    Format your response as professional analysis with 3-4 distinct paragraphs.
    Use proper paragraph breaks (double new lines) between paragraphs.

    <critical_instructions>
    - DO NOT start with introductory phrases like "Here's an analysis..." or "This image shows...". Begin directly with the analysis.
    - DO NOT use markdown formatting (like **, *, #, lists). Output plain text paragraphs only.
    - ENSURE each paragraph is separated by a blank line in the output.
    - Keep the analysis concise and relevant to a social media context.
    </critical_instructions>`;
  },
  {
    requiresPremium: true,
    useGemini: true,
    getUpgradeMessage: (type) => getUpgradeMessageHTML('AI Image Analysis', premiumDescriptions.imageAnalysis, 'upgradeImageAnalysisBtn')
  }
));

/**
 * Verify Stripe session payment status
 */
async function verifyStripeSession(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      paid: session.payment_status === 'paid',
      metadata: session.metadata || {},
      message: session.payment_status === 'paid' ? 'Payment verified' : 'Payment not completed'
    };
  } catch (error) {
    logger.error('Error verifying Stripe session:', error);
    return {
      paid: false,
      metadata: {},
      message: 'Session verification failed'
    };
  }
}

/**
 * Generate analysis prompts
 */
function generateExecutiveSummaryPrompt(processedData, isPaid, timeframe) {
  const tweetStats = {
    totalTweetsAnalyzed: processedData.allTweets.length,
    totalArchiveTweets: !isPaid
      ? (processedData._rawTweetCountInTimeframe > processedData._processedTweetCount
          ? `Latest ${processedData._processedTweetCount} of ${processedData._rawTweetCountInTimeframe}`
          : `All ${processedData._processedTweetCount}`)
      : `All ${processedData._processedTweetCount}`,
    originalTweets: processedData.originalTweets.length,
    replies: processedData.replies.length,
    totalLikes: processedData.allTweets.reduce((sum, t) => sum + parseInt(t.favorite_count || 0), 0),
    totalRetweets: processedData.allTweets.reduce((sum, t) => sum + parseInt(t.retweet_count || 0), 0),
    mostActiveHour: processedData.temporalData.hourlyActivity.indexOf(Math.max(...processedData.temporalData.hourlyActivity)),
    mostActiveDay: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][
      processedData.temporalData.dailyActivity.indexOf(Math.max(...processedData.temporalData.dailyActivity))
    ]
  };
  const tfText = timeframe === 'all' ? 'entire Twitter archive' : `last ${timeframe.replace('last-','')}`;
  const limitedNote = processedData._isFreeTierLimited
    ? `NOTE: Limited to latest ${processedData._processedTweetCount} tweets${timeframe==='all'?'':' within this timeframe'}. Full analysis available after upgrade.`
    : `This is a full analysis of the ${tfText}.`;
  return `Analyze this Twitter data and provide an executive summary for the ${tfText}. ${limitedNote}

Tweet Stats: ${JSON.stringify(tweetStats, null,2)}

Sample Tweets (up to 50): ${JSON.stringify(processedData.allTweets.slice(0,50).map(t=>t.full_text||t.text), null,2)}

Format as HTML, 3-4 short <p> blocks with key insights. ${processedData._isFreeTierLimited?'Clarify that patterns may differ with more data.':''}`;
}

function generateActivityAnalysisPrompt(data, isPaid, timeframe) {
  const activityData = {
    hourlyActivity: data.temporalData?.hourlyActivity || [],
    dailyActivity: data.temporalData?.dailyActivity || [],
    monthlyActivity: Object.entries(data.temporalData?.monthlyActivity || {}),
    totalTweetsAnalyzed: data.allTweets.length,
    originalTweets: data.originalTweets?.length || 0,
    replies: data.replies?.length || 0,
    avgHourlyEngagement: data.temporalData?.avgHourlyEngagement || [],
    hourlyTweetCount: data.temporalData?.hourlyTweetCount || [],
    avgDailyEngagement: data.temporalData?.avgDailyEngagement || [],
    dailyTweetCount: data.temporalData?.dailyTweetCount || []
  };
  
  const tfText = timeframe === 'all' ? 'entire archive' : `last ${timeframe} days`;
  
  return `
    Analyze this Twitter activity/engagement timing data for the ${tfText}.
    ${!isPaid ? `NOTE: Based on latest 100 tweets${timeframe === 'all' ? '' : ' in this period'}.` : ''}

    Activity & Engagement Timing Data:
    Total Tweets Analyzed: ${activityData.totalTweetsAnalyzed}
    Original Tweets: ${activityData.originalTweets}
    Replies: ${activityData.replies}
    Avg Engagement / Hour: ${JSON.stringify(activityData.avgHourlyEngagement.map(n => n.toFixed(2)), null, 2)}
    Tweet Count / Hour: ${JSON.stringify(activityData.hourlyTweetCount, null, 2)}
    Avg Engagement / Day: ${JSON.stringify(activityData.avgDailyEngagement.map(n => n.toFixed(2)), null, 2)}
    Tweet Count / Day: ${JSON.stringify(activityData.dailyTweetCount, null, 2)}
    Monthly Activity: ${JSON.stringify(activityData.monthlyActivity, null, 2)}

    Provide 3 short <p> insights highlighting best times for engagement for this timeframe only. Do NOT add titles.
    ${!isPaid ? 'Mention limited data caveat.' : ''}
  `;
}

/**
 * @route POST /api/analyze/scrape-and-analyze
 * @desc Scrape Twitter data via Apify and run AI analysis
 */
router.post('/scrape-and-analyze', [
  body('twitterHandle').isString().notEmpty().withMessage('Twitter handle is required'),
  body('paymentSessionId').isString().notEmpty().withMessage('Payment session ID is required'),
  body('timeframe').optional().isString().withMessage('Timeframe must be a string'),
  body('numBlocks').isInt({ min: 1, max: 100 }).withMessage('Number of blocks must be an integer between 1 and 100'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }
    next();
  }
], async (req, res) => {
  try {
    const { twitterHandle, paymentSessionId, timeframe = 'all', numBlocks } = req.body;
    
    // Verify payment
    const payment = await verifyStripeSession(paymentSessionId);
    if (!payment.paid) {
      return res.status(402).json({ status: 'error', message: payment.message });
    }
    
    // Verify payment session details match request
    if (payment.metadata.twitterHandle !== twitterHandle || parseInt(payment.metadata.numBlocks) !== numBlocks) {
      return res.status(400).json({ status: 'error', message: 'Payment session details mismatch.' });
    }
    
    // Prepare Apify scraping request
    const apifyInput = { 
      searchTerms: [`from:${twitterHandle}`], 
      maxItems: numBlocks * 1000 
    };
    const apifyUrl = `https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_API_TOKEN}`;
    
    logger.info('Starting Apify scrape', { twitterHandle, numBlocks, maxItems: apifyInput.maxItems });
    
    // Scrape tweets via Apify
    const apifyRes = await axios.post(apifyUrl, apifyInput, { timeout: 180000 });
    const items = Array.isArray(apifyRes.data) ? apifyRes.data : [];
    
    logger.info(`Apify scraping completed`, { itemsReceived: items.length });
    
    // Map Apify data to expected tweet format
    const tweets = items.map(item => ({
      id_str: item.id || item.tweetId || item.tweet_id,
      full_text: item.text || item.full_text || item.content,
      favorite_count: item.likes || item.favorite_count || 0,
      retweet_count: item.retweets || item.retweet_count || 0,
      created_at: item.createdAt || item.created_at || item.date,
      in_reply_to_status_id_str: item.inReplyToStatusId || item.in_reply_to_status_id_str,
      entities: item.entities || {}
    })).filter(t => t.full_text && t.id_str);
    
    logger.info(`Processed tweets`, { tweetCount: tweets.length });
    
    // Process tweet data
    const processed = processTweetData(tweets, timeframe, true);
    
    // Run AI analyses
    const analyses = {};
    const analysisTypes = [
      { key: 'executiveSummary', fn: generateExecutiveSummaryPrompt },
      { key: 'activityAnalysis', fn: generateActivityAnalysisPrompt }
    ];
    
    for (const a of analysisTypes) {
      const prompt = a.fn(processed, true, timeframe);
      analyses[a.key] = await callDeepSeekAPI(prompt, 1000);
    }
    
    // Include processed data
    analyses.processedData = processed;
    
    logger.info('Scrape and analyze completed successfully', { twitterHandle, analysisKeys: Object.keys(analyses) });
    
    res.json({ status: 'success', analyses });
  } catch (error) {
    logger.error('Error in scrape-and-analyze:', error);
    
    let statusCode = 500;
    let message = 'Failed to scrape and analyze tweets. Please try again later.';
    
    if (error.response) {
      if (error.response.status === 429) {
        statusCode = 429;
        message = 'Service rate limit exceeded. Please try again shortly.';
      } else if ([401, 403].includes(error.response.status)) {
        statusCode = 503;
        message = 'External service authentication failed. Please contact support.';
      }
    } else if (error.message.includes('timed out')) {
      statusCode = 504;
      message = 'Request timed out. Please try again later.';
    }
    
    res.status(statusCode).json({ 
      status: 'error', 
      message, 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * @route POST /api/analyze/upload-and-process
 * @desc Upload and process tweet file on server, return session ID
 */
router.post('/upload-and-process', upload.single('tweetFile'), async (req, res) => {
  try {
    const { timeframe = 'all', isPaidUser = false } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file uploaded' 
      });
    }

    // Validate file type
    if (!req.file.originalname.endsWith('.js')) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid file type. Please upload a tweets.js file.' 
      });
    }

    // Read file content
    const fileContent = req.file.buffer.toString('utf8');
    
    // Validate file size (prevent extremely large files)
    const maxSize = 100 * 1024 * 1024; // 100MB limit
    if (fileContent.length > maxSize) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'File too large. Please ensure your tweets.js file is under 100MB.' 
      });
    }

    // Parse and process the tweet data
    const rawTweetData = parseTweetsJS(fileContent);
    const processedData = processTweetData(rawTweetData, timeframe, isPaidUser);

    // Generate a unique session ID using the session manager
    const sessionId = sessionManager.constructor.generateSessionId();
    
    // Store the session data using the session manager
    sessionManager.storeSession(sessionId, {
      rawContent: fileContent,
      processedData,
      timeframe,
      isPaidUser,
      fileName: req.file.originalname
    });

    logger.info('File uploaded and processed successfully', { 
      sessionId, 
      fileName: req.file.originalname,
      tweetCount: processedData.allTweets?.length || 0,
      timeframe,
      isPaidUser
    });

    res.json({
      status: 'success',
      sessionId,
      processedData,
      fileName: req.file.originalname,
      tweetCount: processedData.allTweets?.length || 0
    });

  } catch (error) {
    logger.error('Error in upload-and-process:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to process tweet file' 
    });
  }
});

/**
 * @route GET /api/analyze/session/:sessionId
 * @desc Retrieve session data by session ID
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Session not found or expired' 
      });
    }
    
    res.json({
      status: 'success',
      sessionId,
      processedData: session.processedData,
      fileName: session.fileName,
      timeframe: session.timeframe,
      isPaidUser: session.isPaidUser,
      createdAt: session.createdAt
    });

  } catch (error) {
    logger.error('Error retrieving session:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve session data' 
    });
  }
});

/**
 * @route GET /api/analyze/session/:sessionId/raw
 * @desc Retrieve raw content for a session (for analysis endpoints)
 */
router.get('/session/:sessionId/raw', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Session not found or expired' 
      });
    }
    
    res.json({
      status: 'success',
      rawContent: session.rawContent,
      timeframe: session.timeframe,
      isPaidUser: session.isPaidUser
    });

  } catch (error) {
    logger.error('Error retrieving session raw content:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve session raw content' 
    });
  }
});

/**
 * @route GET /api/analyze/session/stats
 * @desc Get session manager statistics (for monitoring)
 */
router.get('/session/stats', (req, res) => {
  try {
    const stats = sessionManager.getStats();
    
    res.json({
      status: 'success',
      stats
    });

  } catch (error) {
    logger.error('Error retrieving session stats:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retrieve session statistics' 
    });
  }
});

module.exports = router;