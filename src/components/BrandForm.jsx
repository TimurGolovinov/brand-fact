import { useState } from 'react';
import { getBrandFacts } from '../services/getBrandFacts';
import './BrandForm.css';

export default function BrandForm({ onSubmit, isLoading: externalLoading }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitiated, setIsInitiated] = useState(false)
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState({});

  const validateUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Brand name is required';
    }

    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else if (!validateUrl(url)) {
      newErrors.url = 'Please enter a valid URL (e.g., https://example.com)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);
    
    // Notify parent that loading has started
    onSubmit({ loading: true });

    try {
      const trimmedName = name.trim();
      const trimmedUrl = url.trim();
      const facts = await getBrandFacts(trimmedName, trimmedUrl);
      
      // Add IDs to facts for React keys
      const factsWithIds = facts.map((fact, index) => ({
        ...fact,
        id: `fact-${index}-${Date.now()}`
      }));
      
      // Call the onSubmit callback with the results
      onSubmit({ 
        name: trimmedName, 
        url: trimmedUrl,
        facts: factsWithIds,
        loading: false
      });
    } catch (error) {
      // If onSubmit expects an error, pass it through
      onSubmit({ 
        name: name.trim(), 
        url: url.trim(),
        error: error.message || 'Failed to generate facts',
        loading: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="brand-form">
      <div className="form-group">
        <label htmlFor="brand-name">Brand Name</label>
        <input
          id="brand-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter brand name"
          disabled={isLoading || externalLoading}
          className={errors.name ? 'error' : ''}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'brand-name-error' : undefined}
        />
        {errors.name && (
          <span id="brand-name-error" className="error-message" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="brand-url">Website URL</label>
        <input
          id="brand-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={isLoading || externalLoading}
          className={errors.url ? 'error' : ''}
          aria-invalid={!!errors.url}
          aria-describedby={errors.url ? 'brand-url-error' : undefined}
        />
        {errors.url && (
          <span id="brand-url-error" className="error-message" role="alert">
            {errors.url}
          </span>
        )}
      </div>

      <button type="submit" disabled={isLoading || externalLoading} className="submit-button">
        {(isLoading || externalLoading) ? 'Generating Facts...' : 'Generate Facts'}
      </button>
    </form>
  );
}

