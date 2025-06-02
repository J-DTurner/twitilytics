import React, { useState, useRef, useLayoutEffect } from 'react';
import SharedSectionHeader from './shared/SharedSectionHeader';

/**
 * Features Section Component
 * 
 * This section showcases the key features of the Twitilytics
 * premium report to drive conversions for agency and SMM users.
 */
const FeaturesSection = () => {
  const features = [
    {
      id: 'activity',
      title: 'Activity Analysis',
      description: 'Use our Activity Analysis to instantly identify your client\'s best performing posting times and engagement patterns, saving you hours of manual tracking while proving your strategic value with data-backed scheduling recommendations.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      ),
    },
    {
      id: 'topic',
      title: 'Topic Analysis',
      description: "Use our Topic Analysis to instantly find content pillars your client's audience loves, turning hours of guesswork into minutes of strategic insights that win client buy-in and drive engagement.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
      ),
    },
    {
      id: 'media',
      title: 'Media Analysis',
      description: 'Our AI-powered Media Analysis reveals exactly which visual styles drive engagement for each client, empowering you to create winning creative briefs and justify design decisions with concrete performance data.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
      ),
    },
    {
      id: 'monthly',
      title: 'Monthly Trends',
      description: 'Showcase your agency\'s impact with Monthly Trends that clearly demonstrate how your strategies improve performance over time, perfect for quarterly business reviews and retainer renewals.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      ),
    },
    {
      id: 'recommend',
      title: 'Actionable Recommendations',
      description: 'Impress clients with AI-generated recommendations tailored to their unique audience, giving you instant strategic talking points that position you as the expert and justify premium pricing.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
      ),
    },
    {
      id: 'roadmap',
      title: 'Content Strategy Roadmap',
      description: "Never run out of content ideas again—our AI crafts tweet suggestions in your client's authentic voice, saving you hours of brainstorming while ensuring every post resonates with their specific audience.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      ),
    },
  ];

  const [listHeight, setListHeight] = useState('auto');
  const visualRef = useRef(null);
  const desktopBreakpoint = 800;

  useLayoutEffect(() => {
    const updateHeight = () => {
      const currentWindowWidth = window.innerWidth;
      
      if (currentWindowWidth > desktopBreakpoint && visualRef.current) {
        const computedStyle = window.getComputedStyle(visualRef.current);
        const isVisible = computedStyle.display !== 'none' && visualRef.current.offsetHeight > 0;
        
        if (isVisible) {
          const visualPanelHeight = visualRef.current.getBoundingClientRect().height;
          // Ensure visualPanelHeight is a positive number before setting
          if (visualPanelHeight > 0) {
            setListHeight(visualPanelHeight);
          } else {
            setListHeight('auto'); // Fallback if height is zero or negative
          }
        } else {
          setListHeight('auto');
        }
      } else {
        setListHeight('auto');
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const VisualPanel = () => (
    <div ref={visualRef} className="feature-visual">
      <img src="/images/features_section.png" alt="Twitilytics report features illustration" loading="lazy" />
    </div>
  );

  const FeatureList = ({ items, height }) => {
    const wrapperStyle = { 
      height, 
      overflowY: height === 'auto' ? 'visible' : 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--primary-light) var(--secondary-lighter)'
    };
    
    return (
      <div className='feature-list-wrapper' style={wrapperStyle}>
        <div className='feature-track'>
          {items.map(({ id, title, description, icon }, index) => (
            <div 
              key={id} 
              className='feature-entry'
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className='feature-icon' aria-hidden="true">
                <div className="feature-icon-inner">
                  {icon}
                </div>
              </div>
              <div className="feature-content">
                <h3 className='feature-title'>{title}</h3>
                <p className='feature-description'>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="section features-section" id="features">
      <div className="container">
        <SharedSectionHeader
          title="What Your $9 Client-Winning Report Includes"
          subtitle="Deliver exceptional Twitter insights to your clients."
          theme="light"
        />
        
        <div className="feature-split">
          <VisualPanel />
          <FeatureList items={features} height={listHeight} />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;