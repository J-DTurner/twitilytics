const FREE_TIER_TWEET_LIMIT = parseInt(process.env.FREE_TIER_TWEET_LIMIT, 10) || 100;

function parseTweetsJS(fileContent) {
    try {
        const jsonMatch = fileContent.match(/=\s*(\[[\s\S]*\])/);
        if (!jsonMatch || !jsonMatch[1]) {
            throw new Error('Could not find tweet data array in the file content.');
        }
        const jsonString = jsonMatch[1];
        if (!jsonString.trim().startsWith('[') || !jsonString.trim().endsWith(']')) {
            throw new Error('Extracted content does not appear to be a valid JSON array.');
        }
        const tweetData = JSON.parse(jsonString);
        if (!Array.isArray(tweetData)) {
            throw new Error('Parsed data is not an array.');
        }
        return tweetData;
    } catch (error) {
        console.error('Error parsing tweets.js content:', error);
        throw new Error(`Invalid tweets.js file format: ${error.message}`);
    }
}

function normalizeApifyTweetData(apifyData) {
    if (!Array.isArray(apifyData)) {
        throw new Error('Apify data must be an array.');
    }
    return apifyData.map(tweet => {
        if (tweet.tweet) {
            return tweet;
        }
        return {
            tweet: {
                id: tweet.id,
                id_str: tweet.id_str || tweet.id,
                created_at: tweet.created_at || tweet.createdAt,
                full_text: tweet.full_text || tweet.text || tweet.content,
                text: tweet.text || tweet.content || tweet.full_text,
                favorite_count: tweet.favorite_count || tweet.favoriteCount || tweet.likes || 0,
                retweet_count: tweet.retweet_count || tweet.retweetCount || tweet.retweets || 0,
                in_reply_to_status_id: tweet.in_reply_to_status_id || tweet.inReplyToStatusId,
                in_reply_to_status_id_str: tweet.in_reply_to_status_id_str || tweet.inReplyToStatusIdStr,
                retweeted: tweet.retweeted || false,
                entities: tweet.entities || {
                    media: tweet.media || []
                }
            }
        };
    });
}

function filterTweetsByTimeframe(rawTweetData, timeframe) {
    if (timeframe === 'all') {
        return rawTweetData;
    }
    let days;
    switch (timeframe) {
        case 'last-year': days = 365; break;
        case 'last-6-months': days = 180; break;
        case 'last-3-months': days = 90; break;
        case 'last-month': days = 30; break;
        default: return rawTweetData;
    }
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffMs = cutoffDate.getTime();
    return rawTweetData.filter(item => {
        const tweet = item?.tweet;
        if (!tweet || !tweet.created_at) {
            console.warn('Skipping tweet due to missing data:', item);
            return false;
        }
        try {
            const tweetDate = new Date(tweet.created_at);
            return tweetDate.getTime() >= cutoffMs;
        } catch {
            console.warn(`Skipping tweet due to invalid date: ${tweet.created_at}`, item);
            return false;
        }
    });
}

function limitTweetsForFreeTier(tweets) {
    try {
        const sortedTweets = [...tweets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return sortedTweets.slice(0, FREE_TIER_TWEET_LIMIT);
    } catch (e) {
        console.error('Error sorting tweets for free tier limit:', e);
        return tweets.slice(0, FREE_TIER_TWEET_LIMIT);
    }
}

function processTweetData(rawTweetData, timeframe = 'all', isPaidUser = false) {
    if (!Array.isArray(rawTweetData)) {
        throw new Error('Invalid input: rawTweetData must be an array.');
    }
    console.log(`[TweetProcessor] Processing ${rawTweetData.length} items. Timeframe: ${timeframe}, Paid: ${isPaidUser}`);
    
    let normalizedData = rawTweetData;
    if (rawTweetData.length > 0 && rawTweetData[0] && !rawTweetData[0].tweet) {
        console.log('[TweetProcessor] Detected Apify format data, normalizing...');
        normalizedData = normalizeApifyTweetData(rawTweetData);
    }
    
    const timeFilteredData = filterTweetsByTimeframe(normalizedData, timeframe);
    console.log(`[TweetProcessor] ${timeFilteredData.length} items after timeframe filter.`);
    const allTweetsInTimeframe = timeFilteredData.map(item => item?.tweet).filter(Boolean);
    const totalTweetsInTimeframe = allTweetsInTimeframe.length;
    console.log(`[TweetProcessor] ${totalTweetsInTimeframe} valid tweets in timeframe.`);
    let tweetsToProcess = allTweetsInTimeframe;
    if (!isPaidUser && totalTweetsInTimeframe > FREE_TIER_TWEET_LIMIT) {
        tweetsToProcess = limitTweetsForFreeTier(allTweetsInTimeframe);
        console.log(`[TweetProcessor] Applied free tier limit. Processing ${tweetsToProcess.length} tweets.`);
    } else {
        console.log(`[TweetProcessor] Processing all ${tweetsToProcess.length} tweets.`);
    }
    const originalTweets = [];
    const replies = [];
    const mediaItems = [];
    const hourlyActivity = Array(24).fill(0);
    const dailyActivity = Array(7).fill(0);
    const monthlyActivity = {};
    const monthlyEngagement = {};
    const monthlyTweetCount = {};
    const hourlyEngagement = Array(24).fill(0);
    const hourlyTweetCount = Array(24).fill(0);
    const dailyEngagement = Array(7).fill(0);
    const dailyTweetCount = Array(7).fill(0);
    tweetsToProcess.forEach(tweet => {
        if (tweet.retweeted) return;
        if (tweet.in_reply_to_status_id || tweet.in_reply_to_status_id_str) {
            replies.push(tweet);
        } else {
            originalTweets.push(tweet);
        }
        try {
            const date = new Date(tweet.created_at);
            const hour = date.getHours();
            const day = date.getDay();
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            hourlyActivity[hour]++;
            dailyActivity[day]++;
            monthlyActivity[monthYear] = (monthlyActivity[monthYear] || 0) + 1;
            const engagement = (parseInt(tweet.favorite_count) || 0) + (parseInt(tweet.retweet_count) || 0);
            monthlyEngagement[monthYear] = (monthlyEngagement[monthYear] || 0) + engagement;
            monthlyTweetCount[monthYear] = (monthlyTweetCount[monthYear] || 0) + 1;
            hourlyEngagement[hour] += engagement;
            hourlyTweetCount[hour]++;
            dailyEngagement[day] += engagement;
            dailyTweetCount[day]++;
            if (tweet.entities?.media) {
                tweet.entities.media.forEach(media => {
                    mediaItems.push({
                        type: media.type,
                        url: media.media_url_https,
                        tweetId: tweet.id_str,
                        engagement: { likes: parseInt(tweet.favorite_count) || 0, retweets: parseInt(tweet.retweet_count) || 0 },
                        text: tweet.full_text || tweet.text || '',
                        created_at: tweet.created_at
                    });
                });
            }
        } catch (error) {
            console.warn(`Skipping tweet due to date error: ${tweet.id_str}`, error);
        }
    });
    const avgHourlyEngagement = hourlyEngagement.map((total, i) => (hourlyTweetCount[i] ? total / hourlyTweetCount[i] : 0));
    const avgDailyEngagement = dailyEngagement.map((total, i) => (dailyTweetCount[i] ? total / dailyTweetCount[i] : 0));
    const avgMonthlyEngagement = {};
    Object.keys(monthlyEngagement).forEach(month => {
        avgMonthlyEngagement[month] = monthlyTweetCount[month] ? monthlyEngagement[month] / monthlyTweetCount[month] : 0;
    });
    console.log(`[TweetProcessor] Complete. Orig: ${originalTweets.length}, Replies: ${replies.length}, Media: ${mediaItems.length}`);
    return {
        allTweets: tweetsToProcess,
        originalTweets,
        replies,
        mediaItems,
        temporalData: { hourlyActivity, dailyActivity, monthlyActivity, avgHourlyEngagement, hourlyTweetCount, avgDailyEngagement, dailyTweetCount, avgMonthlyEngagement, monthlyTweetCount },
        _rawTweetCountInTimeframe: totalTweetsInTimeframe,
        _processedTweetCount: tweetsToProcess.length,
        _isFreeTierLimited: !isPaidUser && totalTweetsInTimeframe > tweetsToProcess.length
    };
}

module.exports = { parseTweetsJS, normalizeApifyTweetData, filterTweetsByTimeframe, limitTweetsForFreeTier, processTweetData, FREE_TIER_TWEET_LIMIT }; 