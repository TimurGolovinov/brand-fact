import './FactsDisplay.css';

// Helper function to extract markdown links from content and return cleaned content + links
function extractLinksFromContent(content) {
  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  let lastIndex = 0;
  const parts = [];
  
  // Find all markdown links
  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, linkText, linkUrl] = match;
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;
    
    // Add text before the link
    if (matchStart > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, matchStart)
      });
    }
    
    // Add the link
    links.push({ text: linkText, url: linkUrl });
    parts.push({
      type: 'link',
      text: linkText,
      url: linkUrl
    });
    
    lastIndex = matchEnd;
  }
  
  // Add remaining text after the last link
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }
  
  // Generate cleaned content (without markdown syntax)
  let cleanedContent = content.replace(linkRegex, '');
  
  // Remove trailing empty parentheses that might be left after removing markdown links
  // This handles cases like "text. ([link](url))" -> "text. ()" -> "text."
  cleanedContent = cleanedContent.replace(/\s*\(\s*\)/g, '');
  
  return { cleanedContent, links, parts };
}



export default function FactsDisplay({ brand, facts, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="facts-container">
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Scraping website and generating facts...</p>
          <p className="loading-subtitle">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="facts-container">
        <div className="error-state" role="alert">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!brand || !facts || facts.length === 0) {
    return (
      <div className="facts-container">
        <div className="empty-state">
          <p>No facts available. Submit a brand to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="facts-container">
      <div className="brand-header">
        <h2>{brand.name}</h2>
        <a 
          href={brand.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="brand-url"
        >
          {brand.url}
        </a>
      </div>

      <div className="facts-count">
        {facts.length} {facts.length === 1 ? 'fact' : 'facts'} found
      </div>

      <div className="facts-list">
        {facts.map((fact) => {
          const { cleanedContent } = extractLinksFromContent(fact.content || '');
          return (
            <div key={fact.id} className="fact-card">
              <p className="fact-content">{cleanedContent}</p>
              <div className="fact-source">
                <span className="source-label">Source:</span>
                <span className="source-value">
                  <a href={fact.source}>
                    {fact.source}
                  </a>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

