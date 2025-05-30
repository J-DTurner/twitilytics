// limitDataForFree
const FREE_TIER_TWEET_LIMIT = parseInt(process.env.FREE_TIER_TWEET_LIMIT,10) || 100;
function limitDataForFree(tweets) {
  if (!Array.isArray(tweets)) return [];
  if (tweets.length <= FREE_TIER_TWEET_LIMIT) return tweets;
  return tweets
    .slice()
    .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at))
    .slice(0,FREE_TIER_TWEET_LIMIT);
}
module.exports = { limitDataForFree, FREE_TIER_TWEET_LIMIT }; 