import React from 'react';
import { HashLink } from 'react-router-hash-link';
import SharedSectionHeader from './shared/SharedSectionHeader';

/**
 * Problem Section Component
 * 
 * This section highlights the pain points that agencies and SMMs experience
 * with client Twitter reporting, establishing the need for Twitilytics.
 */
const ProblemSection = () => {
  return (
    <section className="section problem-section" id="problem">
      <div className="container">
        <SharedSectionHeader
          title="Struggling With Twitter Reporting?"
          subtitle="Stop wasting hours creating reports that fail to impress clients."
          theme="light"
        />
        
        <div className="problem-grid">
          <div className="problem-text">
            <div className="problem-point">
              <div className="problem-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div>
                <h3>Wasting Billable Hours</h3>
                <p>
                  You're spending 3-5 hours per client collecting Twitter data, <br />
                  analyzing metrics, and creating presentable reports <br />
                  for each monthly client review.
                </p>
              </div>
            </div>
            
            <div className="problem-point">
              <div className="problem-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div>
                <h3>Struggling to Demonstrate ROI</h3>
                <p>
                  Your clients are questioning the value of their Twitter investment, <br />
                  and you need deeper insights to prove your social media management <br />
                  is delivering results.
                </p>
              </div>
            </div>
            
            <div className="problem-point">
              <div className="problem-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div>
                <h3>Inconsistent Reporting</h3>
                <p>
                  Each client report looks different, making it hard to scale <br />
                  your agency and maintain quality as you take on <br />
                  more Twitter management clients.
                </p>
              </div>
            </div>
            
            <div className="problem-point">
              <div className="problem-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
              <div>
                <h3>Missing Strategic Insights</h3>
                <p>
                  Twitter's built-in analytics don't give you the strategic recommendations <br />
                  you need to justify your expertise and client retainer fees.
                </p>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <HashLink smooth to="#solution" className="btn btn-primary btn-lg">
                Discover the Solution
              </HashLink>
            </div>
          </div>
          
          <div className="problem-image-container">
            <img 
              src="/images/problem_section.png" 
              alt="Agency Struggling with Reporting" 
              className="problem-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;