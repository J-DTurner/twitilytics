import React from 'react';
import SharedSectionHeader from './shared/SharedSectionHeader';
// No HashLink needed here as the testimonial link is a standard <a> tag.
// import { HashLink } from 'react-router-hash-link'; 

/**
 * Comparison Section Component
 * 
 * This section provides social proof and a comparison of Twitilytics
 * against alternatives, highlighting its cost-benefit.
 */
const ComparisonSection = () => {
  return (
    <section className="section comparison-section" id="comparison"> {/* Changed ID for clarity */}
      <div className="container">
        {/* The content extracted from FeaturesSection.jsx goes here */}
        {/* Note: The outer div class "agency-program mt-8" might need adjustment
            if its specific styling (like background) is not desired here,
            or this component can be wrapped by such a div in LandingPage.jsx if needed.
            For now, let's assume the primary goal is the content itself.
            The prompt describes it as "social proof/competitor/alternative/cost-benefit breakdown section"
        */}
        
        <SharedSectionHeader
          title="Why Twitilytics Stands Out"
          subtitle="See how we compare to other Twitter analysis methods."
          theme="light"
        />

        <div className="pricing-testimonial"> {/* Testimonial part */}
          <blockquote>
            "My work flow has evolved. I don't spend precious hours breaking down KPIs, or writing page summaries. Twitilytics has cut down the manual process of data analysis, and provided a service which every company can actually use. Immense detail, without the clutter. It makes other third party analytics tools look pre historic. Haven't used anything else since!"
          </blockquote>
          <cite>— <a href="https://x.com/fresh0x" target="_blank" rel="noopener noreferrer" className="testimonial-link">Josh Faber</a>, Marketing Director at TAP Fintech & Cyberfrogs NFT</cite>
        </div>
        
        {/* Changed className from "agency-benefits-grid" to "comparison-grid" for better responsive styling */}
        <div className="comparison-grid mt-8"> 
          <div className="agency-benefit"> {/* Keep agency-benefit for styling individual cards if desired, or switch to comparison-item */}
            <div className="agency-benefit-icon">
              <div className="comparison-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4V20H20"/>
                <rect x="7" y="14" width="3" height="6" rx="1" ry="1"/>
                <rect x="12" y="10" width="3" height="10" rx="1" ry="1"/>
                <rect x="17" y="6" width="3" height="14" rx="1" ry="1"/>
              </svg>
              </div>
            </div>
            <h3 className="agency-benefit-title">Twitter's Built-in Analytics</h3>
            <p className="agency-benefit-description">Basic metrics with limited insights and no client-ready reports or recommendations.</p>
            <div className="comparison-price">Free but Insufficient</div>
          </div>
          
          <div className="agency-benefit">
            <div className="agency-benefit-icon">
              <div className="comparison-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="9" r="3"/>
                <path d="M6 18C6 15 9 13 12 13C15 13 18 15 18 18"/>
              </svg>
              </div>
            </div>
            <h3 className="agency-benefit-title">Manual Agency Reporting</h3>
            <p className="agency-benefit-description">3-5 billable hours of manual data collection, analysis, and report creation per client.</p>
            <div className="comparison-price">$300 - $750/report</div>
            <div className="comparison-note">(at $100 - $150/hour)</div>
          </div>
          
          <div className="agency-benefit">
            <div className="agency-benefit-icon">
              <div className="comparison-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <rect x="7" y="7" width="4" height="4"/>
                <rect x="13" y="7" width="4" height="4"/>
                <rect x="7" y="13" width="4" height="4"/>
                <rect x="13" y="13" width="4" height="4"/>
              </svg>
              </div>
            </div>
            <h3 className="agency-benefit-title">Enterprise Analytics Tools</h3>
            <p className="agency-benefit-description">Complex tools with steep learning curves, monthly subscriptions, and per-seat pricing.</p>
            <div className="comparison-price">$50 - $200/month</div>
            <div className="comparison-note">plus onboarding costs</div>
          </div>
          
          <div className="agency-benefit twitilytics">
            <div className="agency-benefit-icon">
              <div className="comparison-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7V12L15 15"/>
              </svg>
              </div>
            </div>
            <h3 className="agency-benefit-title">Twitilytics AI Analysis</h3>
            <p className="agency-benefit-description">Comprehensive client-ready reports with actionable insights in minutes, not hours.</p>
            <div className="comparison-price">Just $9 per report</div>
            <div className="comparison-roi">3300% ROI vs. manual reporting</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;