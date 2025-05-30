import React from 'react';
import { HashLink } from 'react-router-hash-link';
import SharedSectionHeader from './shared/SharedSectionHeader';

/**
 * How It Works Section Component
 * 
 * This section explains the simple 3-step process for using Twitilytics,
 * making it clear how easy it is to get started.
 */
const HowItWorksSection = () => {
  return (
    <section className="section how-it-works-section how-it-works-dark-theme" id="how-it-works">
      <div className="container">
        <SharedSectionHeader
          title="How to Deliver In-Depth Twitter Audits in 5 Minutes (Not 5 Hours)"
          subtitle="Become Your Clients' Indispensable Social Media Expert."
          theme="dark"
        />
        
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3 className="step-title">Upload Your Twitter Archive</h3>
            <p>
              Request your client's Twitter archive and upload the tweets.js file to our secure platform. 
              The file contains all tweets, engagement data, and media information needed for analysis.
            </p>
            <div className="step-connector"></div>
          </div>
          
          <div className="step-item">
            <div className="step-number">2</div>
            <h3 className="step-title">AI Analyzes the Data</h3>
            <p>
              Our AI engine processes the raw data to identify patterns, engagement trends, optimal posting times, 
              audience preferences, content performance, and strategic opportunities.
            </p>
            <div className="step-connector"></div>
          </div>
          
          <div className="step-item">
            <div className="step-number">3</div>
            <h3 className="step-title">Get Your Personalized Report</h3>
            <p>
              Receive a comprehensive, client-ready report with visualizations, insights, and action recommendations 
              that you can immediately use in your client strategy meetings.
            </p>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <HashLink smooth to="#file-upload" className="btn btn-primary btn-lg">
            Analyze Your First Client
          </HashLink>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;