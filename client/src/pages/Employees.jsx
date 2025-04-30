import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/use-auth.jsx';

function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        const data = await response.json();
        setEmployees(data);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      setEmployees(employees.filter(employee => employee._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading employees...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="employees-page">
      <div className="page-header">
        <h1 className="page-title">Employees</h1>
        <Link href="/employees/new" className="button">
          Add New Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="empty-state">
          <p>No employees have been added yet.</p>
          <Link href="/employees/new" className="button">
            Add Your First Employee
          </Link>
        </div>
      ) : (
        <div className="employee-grid">
          {employees.map((employee) => (
            <div className="employee-card card" key={employee._id}>
              <div className="employee-info">
                <h3>{employee.firstName} {employee.lastName}</h3>
                <p className="employee-title">{employee.title}</p>
                <p className="employee-email">{employee.email}</p>
                <p className="employee-phone">{employee.phone}</p>
              </div>
              <div className="employee-actions">
                <Link href={`/employees/${employee._id}/edit`} className="button button-small">
                  Edit
                </Link>
                <button 
                  className="button button-small button-danger" 
                  onClick={() => handleDeleteEmployee(employee._id)}
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

export default Employees;