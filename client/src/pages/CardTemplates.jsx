import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/use-auth.jsx';

function CardTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both standard templates and custom templates in parallel
        const [templatesResponse, customTemplatesResponse] = await Promise.all([
          fetch('/api/card-templates'),
          fetch('/api/custom-templates')
        ]);
        
        if (!templatesResponse.ok) {
          throw new Error('Failed to fetch card templates');
        }
        
        if (!customTemplatesResponse.ok) {
          throw new Error('Failed to fetch custom templates');
        }
        
        const templatesData = await templatesResponse.json();
        const customTemplatesData = await customTemplatesResponse.json();
        
        setTemplates(templatesData);
        setCustomTemplates(customTemplatesData);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteCustomTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this custom template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete custom template');
      }

      setCustomTemplates(customTemplates.filter(template => template._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading templates...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="templates-page">
      <div className="page-header">
        <h1 className="page-title">Card Templates</h1>
        <Link href="/templates/new" className="button">
          Create Custom Template
        </Link>
      </div>

      <div className="templates-section">
        <h2 className="section-title">Standard Templates</h2>
        <div className="templates-grid">
          {templates.map((template) => (
            <div className="template-card card" key={template._id}>
              <div className="template-preview">
                {template.previewImageUrl ? (
                  <img src={template.previewImageUrl} alt={template.name} className="template-image" />
                ) : (
                  <div className="template-placeholder">{template.name}</div>
                )}
              </div>
              <div className="template-info">
                <h3>{template.name}</h3>
                <p className="template-description">{template.description}</p>
              </div>
              <div className="template-actions">
                <Link href={`/templates/${template._id}/preview`} className="button button-small button-secondary">
                  Preview
                </Link>
                <Link href={`/business-cards/new?templateId=${template._id}`} className="button button-small">
                  Use Template
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {customTemplates.length > 0 && (
        <div className="templates-section">
          <h2 className="section-title">Custom Templates</h2>
          <div className="templates-grid">
            {customTemplates.map((template) => (
              <div className="template-card card" key={template._id}>
                <div className="template-preview">
                  {template.previewImageUrl ? (
                    <img src={template.previewImageUrl} alt={template.name} className="template-image" />
                  ) : (
                    <div className="template-placeholder">{template.name}</div>
                  )}
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p className="template-description">{template.description}</p>
                </div>
                <div className="template-actions">
                  <Link href={`/templates/${template._id}/preview`} className="button button-small button-secondary">
                    Preview
                  </Link>
                  <Link href={`/templates/${template._id}/edit`} className="button button-small">
                    Edit
                  </Link>
                  <button 
                    className="button button-small button-danger" 
                    onClick={() => handleDeleteCustomTemplate(template._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CardTemplates;