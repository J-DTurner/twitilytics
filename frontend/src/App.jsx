import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import ReportPage from './components/report/ReportPage';
import PaymentVerification from './components/payment/PaymentVerification';
import NotFoundPage from './components/NotFoundPage';
import { TweetDataProvider } from './context/TweetDataContext';
import { performStartupCleanup } from './utils/storageCleanup';
import './styles/index.css';

/**
 * Main App Component
 * 
 * This is the root component of the Twitilytics application.
 * It sets up routing, context providers, and legacy script loading.
 */
const App = () => {
  // Set up page title and perform startup cleanup
  useEffect(() => {
    document.title = 'Twitilytics - AI-Powered Twitter Analytics';
    
    // Clean up old localStorage data if present
    performStartupCleanup();
  }, []);

  return (
    <Router>
      <TweetDataProvider>
        <div className="app">
          <div className="main-content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/payment/verify" element={<PaymentVerification />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </div>
      </TweetDataProvider>
    </Router>
  );
};

export default App;