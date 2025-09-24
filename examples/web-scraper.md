# Example: Python Web Scraper

This example shows how Spark can autonomously create a complete Python web scraper with proper structure, dependencies, and error handling.

## Request
```bash
npm start agent "Create a Python web scraper that extracts news articles from multiple sources with data storage"
```

## Generated Workflow

Spark automatically plans and executes this workflow:

```
📋 Workflow Plan: Python Web Scraper (9 steps, ~4 minutes)

1. Create project structure
   - src/
   - tests/ 
   - data/
   - requirements.txt
   - README.md

2. Set up virtual environment
   - python -m venv venv
   - Activation scripts

3. Install dependencies  
   - requests
   - beautifulsoup4
   - pandas
   - pytest
   - python-dotenv

4. Create base scraper class
   - Abstract scraper interface
   - Error handling
   - Rate limiting

5. Implement news source scrapers
   - BBC scraper
   - Reuters scraper  
   - Generic RSS scraper

6. Create data models
   - Article class
   - Data validation
   - Export functionality

7. Add database storage
   - SQLite database
   - Schema creation
   - CRUD operations

8. Create CLI interface
   - argparse configuration
   - Command options
   - Progress reporting

9. Add tests and documentation
   - Unit tests
   - Integration tests
   - Usage documentation
```

## Generated Files

### Project Structure
```
news-scraper/
├── src/
│   ├── __init__.py
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── bbc.py
│   │   ├── reuters.py
│   │   └── rss.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── article.py
│   ├── database/
│   │   ├── __init__.py
│   │   └── storage.py
│   └── cli.py
├── tests/
│   ├── __init__.py
│   ├── test_scrapers.py
│   └── test_models.py
├── data/
├── requirements.txt
├── setup.py
├── .env.example
└── README.md
```

### Key Components Generated

#### Base Scraper Class (`src/scraper/base.py`)
```python
import time
import requests
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

class BaseScraper(ABC):
    """Abstract base class for news scrapers"""
    
    def __init__(self, rate_limit: float = 1.0):
        self.rate_limit = rate_limit
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (News Scraper 1.0)'
        })
    
    @abstractmethod
    def scrape_articles(self, limit: int = 10) -> List[Dict]:
        """Scrape articles from the news source"""
        pass
    
    def _make_request(self, url: str) -> Optional[BeautifulSoup]:
        """Make HTTP request with rate limiting and error handling"""
        try:
            time.sleep(self.rate_limit)
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
```

#### Article Model (`src/models/article.py`)
```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
import json

@dataclass
class Article:
    """Data model for news articles"""
    title: str
    url: str
    source: str
    published_date: Optional[datetime] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
    
    def to_dict(self) -> dict:
        """Convert article to dictionary"""
        return {
            'title': self.title,
            'url': self.url,
            'source': self.source,
            'published_date': self.published_date.isoformat() if self.published_date else None,
            'summary': self.summary,
            'content': self.content,
            'author': self.author,
            'tags': self.tags
        }
    
    def to_json(self) -> str:
        """Convert article to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
```

#### CLI Interface (`src/cli.py`)
```python
import argparse
import sys
from src.scraper.bbc import BBCScraper
from src.scraper.reuters import ReutersScraper
from src.database.storage import ArticleDatabase

def main():
    parser = argparse.ArgumentParser(description='News Article Scraper')
    parser.add_argument('--source', choices=['bbc', 'reuters', 'all'], 
                       default='all', help='News source to scrape')
    parser.add_argument('--limit', type=int, default=10, 
                       help='Number of articles to scrape')
    parser.add_argument('--output', choices=['json', 'csv', 'database'], 
                       default='database', help='Output format')
    
    args = parser.parse_args()
    
    # Initialize scrapers
    scrapers = {
        'bbc': BBCScraper(),
        'reuters': ReutersScraper()
    }
    
    # Initialize database
    db = ArticleDatabase('data/articles.db')
    
    # Scrape articles
    if args.source == 'all':
        sources = scrapers.keys()
    else:
        sources = [args.source]
    
    for source in sources:
        print(f"Scraping {source.upper()}...")
        scraper = scrapers[source]
        articles = scraper.scrape_articles(args.limit)
        
        for article in articles:
            if args.output == 'database':
                db.save_article(article)
            elif args.output == 'json':
                print(article.to_json())
    
    print(f"Scraped {len(articles)} articles successfully!")

if __name__ == '__main__':
    main()
```

## Usage Examples

### Basic Scraping
```bash
cd news-scraper
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Scrape 20 articles from all sources
python src/cli.py --limit 20

# Scrape only from BBC
python src/cli.py --source bbc --limit 5

# Output as JSON
python src/cli.py --source reuters --limit 3 --output json
```

### Database Operations
```python
from src.database.storage import ArticleDatabase

db = ArticleDatabase('data/articles.db')

# Get all articles
articles = db.get_all_articles()

# Search articles
tech_articles = db.search_articles('technology')

# Get articles by source
bbc_articles = db.get_articles_by_source('bbc')
```

### Testing
```bash
# Run all tests
python -m pytest tests/

# Run with coverage
python -m pytest tests/ --cov=src --cov-report=html
```

## Features Implemented

✅ **Multi-source scraping** - BBC, Reuters, RSS feeds  
✅ **Rate limiting** - Respectful scraping with delays  
✅ **Error handling** - Robust error handling and recovery  
✅ **Data validation** - Structured article models  
✅ **Database storage** - SQLite with full CRUD operations  
✅ **CLI interface** - Easy command-line usage  
✅ **Testing** - Unit and integration tests  
✅ **Documentation** - Complete usage documentation  
✅ **Virtual environment** - Isolated Python environment  

## Spark Agent Benefits

This example demonstrates how Spark agents provide:

1. **Complete Project Setup** - Full directory structure, dependencies, and configuration
2. **Best Practices** - Proper Python project structure, error handling, testing
3. **Production Ready** - Database integration, CLI interface, documentation
4. **Extensible Design** - Abstract base classes for easy extension
5. **Zero Manual Work** - Everything created automatically from natural language

Traditional setup would require hours of manual work. Spark completes it in minutes with professional-quality code.
