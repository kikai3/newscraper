const express = require('express');
const cors = require('cors');
const cheerioScraper = require('./scrapers/cheerioScraper');

const app = express();
app.use(cors());
app.use(express.json());

// Add request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  next();
});

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    console.log(`Scraping ${url} with Cheerio`);
    
    const data = await cheerioScraper(url);
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.json({ error: 'No articles found. This website structure may not be supported.' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Scraping error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      res.status(500).json({ error: 'Website not found or unreachable' });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(500).json({ error: 'Connection refused by the website' });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(500).json({ error: 'Request timed out' });
    } else {
      res.status(500).json({ error: 'Failed to scrape this website. It may not be supported.' });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});


