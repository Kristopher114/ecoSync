// Live Disaster News Wire API Service
const newsCache = {
  timestamp: 0,
  data: []
};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache to optimize performance

/**
 * Clean text from HTML entities and extra whitespace
 */
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

/**
 * Fetch real-time live disaster and extreme weather news wire
 */
async function getLiveDisasterNews() {
  // Check in-memory cache
  if (newsCache.data.length > 0 && Date.now() - newsCache.timestamp < CACHE_TTL_MS) {
    return { articles: newsCache.data, cached: true, source: 'Live Disaster News Wire Feed' };
  }

  // 1. If user provided GNews API key in .env, prioritize GNews API
  if (process.env.GNEWS_API_KEY && process.env.GNEWS_API_KEY !== 'YOUR_GNEWS_API_KEY_HERE') {
    try {
      const gnewsUrl = `https://gnews.io/api/v4/search?q=disaster%20OR%20typhoon%20OR%20flood&lang=en&max=6&token=${process.env.GNEWS_API_KEY}`;
      const res = await fetch(gnewsUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const json = await res.json();
        const articles = (json.articles || []).map((art, idx) => ({
          id: `gn-${idx}`,
          title: art.title,
          url: art.url,
          source: art.source?.name || 'GNews Wire',
          published_at: art.publishedAt || new Date().toISOString(),
          description: art.description || ''
        }));

        if (articles.length > 0) {
          newsCache.data = articles;
          newsCache.timestamp = Date.now();
          return { articles, cached: false, source: 'GNews Disaster API' };
        }
      }
    } catch (gerr) {
      console.warn('GNews fetch failed, falling back to live RSS wire:', gerr.message);
    }
  }

  // 2. Primary 100% Free Live Disaster News Feed (Google News Disaster & Meteorological RSS Feed)
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=disaster+OR+flood+OR+typhoon+OR+earthquake+when:7d&hl=en-PH&gl=PH&ceid=PH:en';
    const res = await fetch(rssUrl, { signal: AbortSignal.timeout(6000) });
    
    if (!res.ok) {
      throw new Error(`News feed responded with status ${res.status}`);
    }

    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles = [];

    for (let i = 0; i < Math.min(itemMatches.length, 6); i++) {
      const itemXml = itemMatches[i];
      const rawTitle = (itemXml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      const rawLink = (itemXml.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      const rawPubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
      const rawSource = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'Disaster Wire';

      // Parse relative time like "1h ago"
      let formattedTime = 'Recently';
      if (rawPubDate) {
        const diffMs = Date.now() - new Date(rawPubDate).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffHours >= 24) formattedTime = `${Math.floor(diffHours / 24)}d ago`;
        else if (diffHours >= 1) formattedTime = `${diffHours}h ago`;
        else if (diffMins >= 1) formattedTime = `${diffMins}m ago`;
        else formattedTime = 'Just now';
      }

      articles.push({
        id: `news-${i + 1}`,
        title: cleanText(rawTitle),
        url: cleanText(rawLink),
        time: formattedTime,
        source: cleanText(rawSource),
        published_at: rawPubDate
      });
    }

    if (articles.length > 0) {
      newsCache.data = articles;
      newsCache.timestamp = Date.now();
      return { articles, cached: false, source: 'Real-Time Disaster News Wire Feed' };
    }
  } catch (err) {
    console.warn('Live news wire failed, using fallback emergency bulletin:', err.message);
  }

  // 3. Fallback Bulletins to guarantee 100% demo uptime
  const fallbackArticles = [
    {
      id: 'fb-1',
      title: 'Disaster Relief Teams Deployed across Low-Lying Communities',
      url: '#',
      time: '14m ago',
      source: 'National Relief Grid'
    },
    {
      id: 'fb-2',
      title: 'Severe Weather Warning: Flash Flood Advisories Raised for Multiple Sectors',
      url: '#',
      time: '42m ago',
      source: 'Meteorological Dispatch'
    },
    {
      id: 'fb-3',
      title: 'Emergency Evacuation Centers Activated: Relief Supplies Pre-positioned',
      url: '#',
      time: '1h ago',
      source: 'Disaster Operations'
    }
  ];

  return { articles: fallbackArticles, cached: false, source: 'EcoSync Emergency Bulletin (Fallback)' };
}

module.exports = { getLiveDisasterNews };
