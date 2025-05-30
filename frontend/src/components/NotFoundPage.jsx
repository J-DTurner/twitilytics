import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Not Found Page Component
 * 
 * This component is displayed when a user navigates to a route
 * that doesn't exist in the application.
 */
const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="primary-button">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;