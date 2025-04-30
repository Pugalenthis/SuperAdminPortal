import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';

function CardView() {
  const { uniqueUrl } = useParams();
  const [card, setCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const response = await fetch(`/api/card/${uniqueUrl}`);
        if (!response.ok) {
          throw new Error('Failed to fetch business card');
        }
        const data = await response.json();
        setCard(data);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchCard();
  }, [uniqueUrl]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (isLoading) {
    return <div className="loading-card">Loading business card...</div>;
  }

  if (error || !card) {
    return (
      <div className="card-view-error">
        <h2>Card Not Found</h2>
        <p>Sorry, the business card you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="card-view-page">
      <div className={`card-container ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="card-flipper">
          {/* Front of the card */}
          <div className="card-front" style={{ backgroundColor: card.backgroundColor || '#ffffff', color: card.textColor || '#000000' }}>
            <div className="card-content">
              <div className="employee-info">
                <h1 className="employee-name">{card.employeeName}</h1>
                <p className="employee-title">{card.employeeTitle}</p>
                <p className="company-name">{card.companyName}</p>
              </div>
              
              <div className="contact-info">
                {card.email && (
                  <div className="contact-item">
                    <span className="icon">✉️</span>
                    <a href={`mailto:${card.email}`}>{card.email}</a>
                  </div>
                )}
                
                {card.phone && (
                  <div className="contact-item">
                    <span className="icon">📞</span>
                    <a href={`tel:${card.phone}`}>{card.phone}</a>
                  </div>
                )}
                
                {card.linkedin && (
                  <div className="contact-item">
                    <span className="icon">🔗</span>
                    <a href={card.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                )}
                
                {card.twitter && (
                  <div className="contact-item">
                    <span className="icon">🐦</span>
                    <a href={card.twitter} target="_blank" rel="noopener noreferrer">Twitter/X</a>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Back of the card */}
          <div className="card-back" style={{ backgroundColor: card.companyCardBackgroundColor || '#0066cc', color: card.companyCardTextColor || '#ffffff' }}>
            <div className="card-content">
              {card.companyLogo && (
                <div className="company-logo">
                  <img src={card.companyLogo} alt={card.companyName} />
                </div>
              )}
              
              <div className="company-info">
                <h2 className="company-name">{card.companyName}</h2>
                {card.companyTagline && <p className="company-tagline">{card.companyTagline}</p>}
                
                <div className="company-contact-info">
                  {card.companyAddress && (
                    <div className="contact-item">
                      <span className="icon">📍</span>
                      <span>{card.companyAddress}</span>
                    </div>
                  )}
                  
                  {card.companyEmail && (
                    <div className="contact-item">
                      <span className="icon">✉️</span>
                      <a href={`mailto:${card.companyEmail}`}>{card.companyEmail}</a>
                    </div>
                  )}
                  
                  {card.companyPhone && (
                    <div className="contact-item">
                      <span className="icon">📞</span>
                      <a href={`tel:${card.companyPhone}`}>{card.companyPhone}</a>
                    </div>
                  )}
                  
                  {card.companyWebsite && (
                    <div className="contact-item">
                      <span className="icon">🌐</span>
                      <a href={card.companyWebsite} target="_blank" rel="noopener noreferrer">{card.companyWebsite.replace(/^https?:\/\//, '')}</a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card-actions">
        <button className="flip-button" onClick={handleFlip}>
          {isFlipped ? 'Show Front' : 'Show Back'}
        </button>
        
        <button className="save-contact-button" onClick={() => window.alert('Contact saving feature coming soon!')}>
          Save Contact
        </button>
      </div>
    </div>
  );
}

export default CardView;