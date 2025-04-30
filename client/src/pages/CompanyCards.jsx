import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/use-auth.jsx';

function CompanyCards() {
  const { user } = useAuth();
  const [companyCards, setCompanyCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanyCards = async () => {
      try {
        const response = await fetch('/api/company-cards');
        if (!response.ok) {
          throw new Error('Failed to fetch company cards');
        }
        const data = await response.json();
        setCompanyCards(data);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchCompanyCards();
  }, []);

  const handleDeleteCard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company card?')) {
      return;
    }

    try {
      const response = await fetch(`/api/company-cards/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete company card');
      }

      setCompanyCards(companyCards.filter(card => card._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetActive = async (id) => {
    try {
      const response = await fetch(`/api/company-cards/${id}/activate`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to set company card as active');
      }

      // Update the local state to reflect the new active card
      setCompanyCards(companyCards.map(card => ({
        ...card,
        isActive: card._id === id
      })));
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading company cards...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="company-cards-page">
      <div className="page-header">
        <h1 className="page-title">Company Cards</h1>
        <Link href="/company-cards/new" className="button">
          Create New Company Card
        </Link>
      </div>

      <div className="section-info">
        <p>
          Company cards are displayed on the back of your employees' business cards.
          They showcase your company information and branding.
          You can create multiple designs but only one can be active at a time.
        </p>
      </div>

      {companyCards.length === 0 ? (
        <div className="empty-state">
          <p>No company cards have been created yet.</p>
          <Link href="/company-cards/new" className="button">
            Create Your First Company Card
          </Link>
        </div>
      ) : (
        <div className="company-cards-grid">
          {companyCards.map((card) => (
            <div className={`company-card-item card ${card.isActive ? 'card-active' : ''}`} key={card._id}>
              <div className="card-status">
                {card.isActive && <span className="status-badge">Active</span>}
              </div>
              <div className="card-preview">
                {card.frontImageUrl ? (
                  <img src={card.frontImageUrl} alt="Company Card Front" className="company-card-image" />
                ) : (
                  <div className="company-card-placeholder">
                    <h3>{user?.orgName || 'Your Company'}</h3>
                    <p>{card.tagline || 'Your tagline here'}</p>
                  </div>
                )}
              </div>
              <div className="card-info">
                <h3>{card.name || 'Default Company Card'}</h3>
                <p className="card-date">
                  Created: {new Date(card.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="card-actions">
                <Link href={`/company-cards/${card._id}/edit`} className="button button-small">
                  Edit
                </Link>
                {!card.isActive && (
                  <button 
                    className="button button-small button-secondary"
                    onClick={() => handleSetActive(card._id)}
                  >
                    Set Active
                  </button>
                )}
                {!card.isActive && (
                  <button 
                    className="button button-small button-danger" 
                    onClick={() => handleDeleteCard(card._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompanyCards;