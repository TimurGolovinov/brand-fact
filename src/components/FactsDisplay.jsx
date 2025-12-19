import './FactsDisplay.css';

// Helper function to render source text with links
function renderSourceWithLinks(source) {
  const parts = [];
  let lastIndex = 0;
  
  // First, find and replace markdown-style links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(source)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = source.substring(lastIndex, match.index);
      if (beforeText) {
        parts.push({ type: 'text', content: beforeText });
      }
    }
    
    // Process the markdown link
    let linkUrl = match[2]; // URL from parentheses
    let displayText = match[1]; // Text from brackets
    
    // If URL doesn't start with http:// or https://, add https://
    if (!/^https?:\/\//.test(linkUrl)) {
      linkUrl = `https://${linkUrl}`;
    }
    
    // Try to extract domain from URL for cleaner display
    // If the text is already a domain-like string, use it; otherwise extract from URL
    try {
      const url = new URL(linkUrl);
      displayText = url.hostname.replace(/^www\./, '');
    } catch {
      // If URL parsing fails, use the text from brackets
      displayText = match[1];
    }
    
    parts.push({ type: 'link', url: linkUrl, text: displayText });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last match
  if (lastIndex < source.length) {
    const remainingText = source.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // If no markdown links found, process the whole string for regular URLs
  if (parts.length === 0) {
    parts.push({ type: 'text', content: source });
  }
  
  // Render parts, processing URLs in text segments
  return parts.map((part, partIndex) => {
    if (part.type === 'link') {
      return (
        <a
          key={partIndex}
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className="source-link"
        >
          {part.text}
        </a>
      );
    }
    
    // Process regular URLs in text content
    const urlRegex = /(https?:\/\/[^\s\)]+)/g;
    const textParts = part.content.split(urlRegex);
    
    return textParts.map((textPart, textIndex) => {
      if (/^https?:\/\//.test(textPart)) {
        try {
          const url = new URL(textPart);
          const domain = url.hostname.replace(/^www\./, '');
          return (
            <a
              key={`${partIndex}-${textIndex}`}
              href={textPart}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              {domain}
            </a>
          );
        } catch {
          return <span key={`${partIndex}-${textIndex}`}>{textPart}</span>;
        }
      }
      return <span key={`${partIndex}-${textIndex}`}>{textPart}</span>;
    });
  }).flat();
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
        {facts.map((fact) => (
          <div key={fact.id} className="fact-card">
            <p className="fact-content">{fact.content}</p>
            <div className="fact-source">
              <span className="source-label">Source:</span>
              <span className="source-value">{renderSourceWithLinks(fact.source)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

