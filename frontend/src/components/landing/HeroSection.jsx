import React from 'react';
import { Link } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';

/**
 * Hero Section Component
 * 
 * The main banner section for the landing page, designed to grab attention
 * and communicate the main value proposition of Twitilytics to agencies and SMMs.
 */
const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        {/* Added hero-text-content wrapper */}
        <div className="hero-text-content">
          <div className="hero-header">
            <h1 className="hero-title">
              Stop Wasting Hours on Twitter Reports.
            </h1>
            
            <p className="hero-subtitle">
            Get AI-Powered Client Audits in 5 Minutes.<br/><br/>
            Justify your fees and scale your agency - for just $9.
            </p>
          </div>
          
          <div className="hero-buttons">
            <HashLink smooth to="#file-upload" className="btn btn-primary btn-lg">
              Analyze Client Accounts
            </HashLink>
            
            <HashLink smooth to="#how-it-works" className="btn btn-accent btn-lg">
              See How It Works
            </HashLink>
          </div>
        </div>
        
        <img 
          src="/images/hero_section.png" 
          alt="Twitilytics Agency Dashboard Preview" 
          className="hero-image"
        />
      </div>
      
      <div className="hero-background">
        {/* Background decorative elements */}
        <div className="bg-shape bg-shape-1"></div>
        <div className="bg-shape bg-shape-2"></div>
        <div className="bg-shape bg-shape-3"></div>
      </div>
    </section>
  );
};

export default HeroSection;