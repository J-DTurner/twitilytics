import React from 'react';
import { HashLink } from 'react-router-hash-link';
import SharedSectionHeader from './shared/SharedSectionHeader';
import SharedBenefitCard from './shared/SharedBenefitCard';

/**
 * Solution Section Component
 */
const SolutionSection = () => {
  const benefits = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      ),
      title: "Save 3+ Hours Per Client Easily",
      description: "Turn hours of manual data collection and analysis into a 5-minute process, freeing up billable time for strategic work."
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 12 4 15 11 8"></polyline>
          <polyline points="15 8 18 11 23 5"></polyline>
          <line x1="11" y1="15" x2="16" y2="15"></line>
          <line x1="11" y1="19" x2="19" y2="19"></line>
        </svg>
      ),
      title: "Easy Client Retention Booster",
      description: "Improve your client retention rates by clearly demonstrating the impact of your Twitter management services."
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      ),
      title: "Add a Profitable Service Offering",
      description: "Create a new revenue stream by offering in-depth Twitter audits as a standalone service or value-add to existing packages."
    }
  ];

  return (
    <section className="section solution-section" id="solution">
      <div className="container">
        <SharedSectionHeader
          title="Audits That Win Clients"
          subtitle="Professional reports and strategic recommendations in minutes."
          theme="dark"
        />
        
        <div className="solution-content">          
          <div className="solution-benefits"> {/* This class provides the grid layout */}
            {benefits.map((benefit, index) => (
              <SharedBenefitCard
                key={index}
                icon={benefit.icon}
                title={benefit.title}
                description={benefit.description}
              />
            ))}
          </div>
          
          <div className="solution-cta mt-8">
            <HashLink smooth to="#file-upload" className="btn btn-accent btn-lg">
              Generate Your First Client Report
            </HashLink>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;