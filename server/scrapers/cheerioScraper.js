const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeArticles(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const articles = [];

    $('article').each((i, el) => {
      const title = $(el).find('h1, h2, h3').first().text().trim();
      const link = $(el).find('a').attr('href');
      const author = $(el).find('.author').text().trim();
      const date = $(el).find('time').attr('datetime');

      if (title && link) {
        articles.push({
          title,
          link,
          author,
          date,
          source: url,
        });
      }
    });

    return articles;
  } catch (err) {
    console.error("Scraper error:", err.message);
    throw new Error('Failed to fetch or parse the website.');
  }
}

module.exports = scrapeArticles;
