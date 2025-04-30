import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/use-auth.jsx';

function BusinessCards() {
  const { user } = useAuth();
  const [businessCards, setBusinessCards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both business cards and employees in parallel
        const [businessCardsResponse, employeesResponse] = await Promise.all([
          fetch('/api/business-cards'),
          fetch('/api/employees')
        ]);
        
        if (!businessCardsResponse.ok) {
          throw new Error('Failed to fetch business cards');
        }
        
        if (!employeesResponse.ok) {
          throw new Error('Failed to fetch employees');
        }
        
        const businessCardsData = await businessCardsResponse.json();
        const employeesData = await employeesResponse.json();
        
        setBusinessCards(businessCardsData);
        setEmployees(employeesData);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteCard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this business card?')) {
      return;
    }

    try {
      const response = await fetch(`/api/business-cards/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete business card');
      }

      setBusinessCards(businessCards.filter(card => card._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  if (isLoading) {
    return <div className="loading">Loading business cards...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="business-cards-page">
      <div className="page-header">
        <h1 className="page-title">Business Cards</h1>
        <Link href="/business-cards/new" className="button">
          Create New Card
        </Link>
      </div>

      {businessCards.length === 0 ? (
        <div className="empty-state">
          <p>No business cards have been created yet.</p>
          <Link href="/business-cards/new" className="button">
            Create Your First Card
          </Link>
        </div>
      ) : (
        <div className="business-cards-grid">
          {businessCards.map((card) => (
            <div className="business-card-item card" key={card._id}>
              <div className="card-header">
                <h3>{getEmployeeName(card.employeeId)}</h3>
                <span className="card-template">Template: {card.templateName || 'Standard'}</span>
              </div>
              <div className="card-qr">
                {card.qrCodeUrl && (
                  <img src={card.qrCodeUrl} alt="QR Code" className="qr-code-preview" />
                )}
              </div>
              <div className="card-url">
                <span className="url-label">Card URL:</span>
                <a href={`/card/${card.uniqueUrl}`} target="_blank" rel="noopener noreferrer">
                  /card/{card.uniqueUrl}
                </a>
              </div>
              <div className="card-actions">
                <Link href={`/business-cards/${card._id}/edit`} className="button button-small">
                  Edit
                </Link>
                <Link href={`/card/${card.uniqueUrl}`} className="button button-small button-secondary">
                  View
                </Link>
                <button 
                  className="button button-small button-danger" 
                  onClick={() => handleDeleteCard(card._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BusinessCards;