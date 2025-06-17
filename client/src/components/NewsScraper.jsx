import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const NewsScraper = () => {
  const [url, setUrl] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [error, setError] = useState('');

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');
    setArticles([]);

    try {
      const { data } = await axios.get(`http://localhost:4000/scrape`, {
        params: { url: url.trim() },
        timeout: 30000
      });
      
      if (data.error) {
        setError(data.error);
      } else if (Array.isArray(data) && data.length > 0) {
        setArticles(data);
      } else {
        setError('No articles found. This website might not be supported or may have changed its structure.');
      }
    } catch (error) {
      console.error("Scrape failed", error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. The website may be slow or unreachable.');
      } else if (error.response?.status === 500) {
        setError('Server error. The website structure may not be supported.');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to scrape. Please check the URL and try again.');
      }
    }
    setLoading(false);
  };

  const filteredArticles = articles
    .filter(a => a.title && a.title.toLowerCase().includes(keyword.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      }
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

  return (
    <div className="container mt-4">
      <div className="mb-3">
        <input 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          placeholder="Enter website URL (e.g., https://example.com)" 
          className="form-control mb-2" 
        />
        
        <button onClick={handleScrape} className="btn btn-primary" disabled={loading}>
          {loading ? 'Scraping...' : 'Scrape News'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row mb-3">
        <div className="col-md-6">
          <input 
            value={keyword} 
            onChange={e => setKeyword(e.target.value)} 
            placeholder="Filter by keyword" 
            className="form-control" 
          />
        </div>
        <div className="col-md-6">
          <select onChange={e => setSortBy(e.target.value)} className="form-select">
            <option value="">Sort By</option>
            <option value="date">Publication Date</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {filteredArticles.length > 0 && (
        <div>
          <h4>Found {filteredArticles.length} articles</h4>
          <ul className="list-group">
            {filteredArticles.map((a, i) => (
              <li key={i} className="list-group-item">
                <h5>{a.title}</h5>
                <p><strong>Author:</strong> {a.author || 'N/A'} | <strong>Date:</strong> {a.date || 'N/A'}</p>
                <p><strong>Source:</strong> {a.source}</p>
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">Read More</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NewsScraper;
