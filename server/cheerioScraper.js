const axios = require('axios');
const cheerio = require('cheerio');

const commonSelectors = {
  // Common article selectors for different sites
  articles: [
    'article',
    '.article',
    '.post',
    '.news-item',
    '.story',
    '[data-testid="article"]',
    '.entry',
    '.item',
    '.card',
    '.content-item',
    '.news-article'
  ],
  titles: [
    'h1', 'h2', 'h3', 'h4',
    '.title',
    '.headline',
    '[data-testid="headline"]',
    '.article-title',
    '.post-title',
    '.entry-title',
    '.news-title'
  ],
  links: [
    'a[href]'
  ],
  dates: [
    'time',
    '.date',
    '.published',
    '.timestamp',
    '[datetime]',
    '.publish-date',
    '.post-date',
    '.article-date'
  ],
  authors: [
    '.author',
    '.byline',
    '.writer',
    '[data-testid="author"]',
    '.post-author',
    '.article-author',
    '[rel="author"]'
  ]
};

module.exports = async function cheerioScraper(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(data);
    const articles = [];
    const baseUrl = new URL(url).origin;
    const hostname = new URL(url).hostname;

    // Strategy 1: Try different article selectors
    for (const articleSelector of commonSelectors.articles) {
      const foundArticles = $(articleSelector);
      
      if (foundArticles.length > 0) {
        foundArticles.each((i, element) => {
          const $article = $(element);
          
          // Try to find title
          let title = '';
          for (const titleSelector of commonSelectors.titles) {
            const titleEl = $article.find(titleSelector).first();
            if (titleEl.length && titleEl.text().trim()) {
              title = titleEl.text().trim();
              break;
            }
          }
          
          // Try to find link
          let link = '';
          const linkEl = $article.find('a[href]').first();
          if (linkEl.length) {
            const href = linkEl.attr('href');
            if (href) {
              try {
                link = href.startsWith('http') ? href : new URL(href, url).href;
              } catch (e) {
                link = url; // fallback to original URL
              }
            }
          }
          
          // Try to find date
          let date = '';
          for (const dateSelector of commonSelectors.dates) {
            const dateEl = $article.find(dateSelector).first();
            if (dateEl.length) {
              date = dateEl.attr('datetime') || dateEl.text().trim();
              break;
            }
          }
          
          // Try to find author
          let author = '';
          for (const authorSelector of commonSelectors.authors) {
            const authorEl = $article.find(authorSelector).first();
            if (authorEl.length && authorEl.text().trim()) {
              author = authorEl.text().trim();
              break;
            }
          }

          if (title && title.length > 10) { // Filter out very short titles
            articles.push({
              title,
              link: link || url,
              date: date || new Date().toISOString(),
              author: author || 'Unknown',
              source: hostname
            });
          }
        });
        
        if (articles.length > 0) break;
      }
    }

    // Strategy 2: If no articles found with article selectors, try headline approach
    if (articles.length === 0) {
      for (const titleSelector of commonSelectors.titles) {
        $(titleSelector).each((i, element) => {
          const $el = $(element);
          const title = $el.text().trim();
          
          if (title.length > 15) { // Likely an article title
            let link = '';
            
            // Try to find associated link
            const parentLink = $el.closest('a').attr('href');
            const siblingLink = $el.siblings('a').first().attr('href');
            const childLink = $el.find('a').first().attr('href');
            
            const foundHref = parentLink || childLink || siblingLink;
            
            if (foundHref) {
              try {
                link = foundHref.startsWith('http') ? foundHref : new URL(foundHref, url).href;
              } catch (e) {
                link = url;
              }
            }
            
            articles.push({
              title,
              link: link || url,
              date: new Date().toISOString(),
              author: 'Unknown',
              source: hostname
            });
          }
        });
        
        if (articles.length > 0) break;
      }
    }

    // Strategy 3: Last resort - look for any links with meaningful text
    if (articles.length === 0) {
      $('a[href]').each((i, element) => {
        const $link = $(element);
        const title = $link.text().trim();
        const href = $link.attr('href');
        
        // Filter for likely article links
        if (title.length > 20 && href && !href.includes('#') && !href.includes('javascript:')) {
          try {
            const fullLink = href.startsWith('http') ? href : new URL(href, url).href;
            
            articles.push({
              title,
              link: fullLink,
              date: new Date().toISOString(),
              author: 'Unknown',
              source: hostname
            });
          } catch (e) {
            // Skip invalid links
          }
        }
      });
    }

    // Remove duplicates based on title
    const uniqueArticles = articles.filter((article, index, self) => 
      index === self.findIndex(a => a.title === article.title)
    );

    // Limit results to prevent overwhelming the UI
    return uniqueArticles.slice(0, 50);

  } catch (error) {
    console.error('Cheerio scraper error:', error.message);
    throw error;
  }
};


