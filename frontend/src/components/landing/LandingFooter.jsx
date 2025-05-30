import React from 'react';
import { Link } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

/**
 * Landing Footer Component
 * 
 * This component renders the footer section of the landing page
 * with links, social media icons, and copyright information.
 */
const LandingFooter = () => {
  return (
    <footer className="landing-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <img 
              src="/images/twitilytics-logo-white.png" 
              alt="Twitilytics Logo"
              height="40"
            />
          </div>
          
          <div className="footer-links">
            <HashLink smooth to="#features" className="footer-link">Features</HashLink>
            <HashLink smooth to="#pricing" className="footer-link">Pricing</HashLink>
            <HashLink smooth to="#how-it-works" className="footer-link">How It Works</HashLink>
            <HashLink smooth to="#faq" className="footer-link">FAQ</HashLink>
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
            <Link to="/terms" className="footer-link">Terms of Service</Link>
            <Link to="/contact" className="footer-link">Contact Us</Link>
          </div>
          
          <div className="footer-social">
            <a 
              href="https://twitter.com/twitilytics" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-icon"
              aria-label="Follow us on Twitter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
              </svg>
            </a>
            
            <a 
              href="https://linkedin.com/company/twitilytics" 
              target="_blank" 
              rel="noopener noreferrer"
              className="social-icon"
              aria-label="Follow us on LinkedIn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-text">
            <p>
              &copy; {new Date().getFullYear()} Twitilytics. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;