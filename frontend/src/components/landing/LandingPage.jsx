import React from 'react';
import HeroSection from './HeroSection';
import ProblemSection from './ProblemSection';
import SolutionSection from './SolutionSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import ComparisonSection from './ComparisonSection';
import PricingSection from './PricingSection';
import FAQSection from './FAQSection';
import AgencySuccessProgram from './AgencySuccessProgram';
import FileUploadSection from './FileUploadSection';
import LandingFooter from './LandingFooter';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ComparisonSection />
      <PricingSection />
      <FileUploadSection />
      <FAQSection />
      <AgencySuccessProgram />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;