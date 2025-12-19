import { useState } from 'react';
import BrandForm from './components/BrandForm';
import FactsDisplay from './components/FactsDisplay';
import './App.css';

function App() {
  const [brand, setBrand] = useState(null);
  const [facts, setFacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = ({ name, url, facts, error: submitError, loading }) => {
    if (loading !== undefined) {
      setIsLoading(loading);
    }
    
    if (loading) {
      // Clear previous results when starting a new search
      setError(null);
      setBrand(null);
      setFacts([]);
      return;
    }
    
    setError(submitError || null);
    if (name && url) {
      setBrand({ name, url });
    }
    setFacts(facts || []);
  };

  return (
    <div className="app">
      
      <header className="app-header">
        <h1>Brand Facts Generator</h1>
        <p className="subtitle">Discover interesting facts about any brand</p>
      </header>

      <main className="app-main">
        <BrandForm onSubmit={handleSubmit} isLoading={isLoading} />
        <FactsDisplay 
          brand={brand} 
          facts={facts} 
          isLoading={isLoading} 
          error={error} 
        />
      </main>
    </div>
  );
}

export default App;

