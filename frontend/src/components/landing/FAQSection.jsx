import React, { useState } from 'react';
import SharedSectionHeader from './shared/SharedSectionHeader';

/**
 * FAQ Section Component
 * 
 * This section addresses common questions about Twitilytics to
 * overcome objections and provide important information for agencies and SMMs.
 */
const FAQSection = () => {
  // State to track which FAQ items are expanded
  const [expandedItems, setExpandedItems] = useState({});
  
  // Toggle FAQ item expanded state
  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // FAQ data - including new agency-specific questions
  const faqs = [
    {
      id: 'faq-1',
      question: 'How do I get my client\'s Twitter archive?',
      answer: (
        <>
          <p>You can guide your clients to request their Twitter archive by following these steps:</p>
          <ol>
            <li>Have your client log in to their Twitter account on the web</li>
            <li>Go to "More" in the navigation menu, then "Settings and privacy"</li>
            <li>Select "Your account", then "Download an archive of your data"</li>
            <li>Verify password, then click "Request archive"</li>
            <li>Twitter will send them an email with a download link when the archive is ready</li>
            <li>Once they download it, they can send you the tweets.js file for analysis</li>
          </ol>
          <p>Twitter usually takes a few hours to prepare the archive. We've found that sending clients a standard email template with these instructions works well for agencies.</p>
        </>
      )
    },
    {
      id: 'faq-2',
      question: 'Can I use this for multiple client accounts?',
      answer: (
        <>
          <p>Yes, absolutely! Twitilytics is designed for agencies and SMMs who manage multiple client accounts:</p>
          <ul>
            <li>You can run analyses for unlimited client Twitter accounts</li>
            <li>Each analysis is just $9, with no subscription or membership required</li>
            <li>Process each client archive separately for individualized reports</li>
            <li>Save and organize reports by client name for easy reference</li>
          </ul>
          <p>Many agencies find Twitilytics to be an ideal solution for scaling their Twitter analytics across all clients without the overhead of expensive enterprise tools.</p>
        </>
      )
    },
    {
      id: 'faq-3',
      question: 'Is the data processed for each client kept separate and secure?',
      answer: (
        <>
          <p>Yes, we take data privacy and client confidentiality very seriously:</p>
          <ul>
            <li>Each client's Twitter data is processed completely separately</li>
            <li>We maintain strict data isolation between all account analyses</li>
            <li>Your clients' data is encrypted during upload and processing</li>
            <li>We never share data between users or clients</li>
            <li>We process the data temporarily and don't permanently store the raw Twitter archives</li>
            <li>All processing is done on secure servers with enterprise-grade security</li>
          </ul>
          <p>This ensures that each client's Twitter data remains confidential and secure throughout the analysis process.</p>
        </>
      )
    },
    {
      id: 'faq-4',
      question: 'Can I add my agency\'s branding to the report?',
      answer: (
        <p>
          We're excited to announce that white-labeling is coming soon! This feature will allow you to add your agency's 
          logo, brand colors, and contact information to all client reports. It will be available as an agency upgrade 
          option in the near future. In the meantime, the current reports are designed with a clean, professional look 
          that agencies can present to clients, and many users export the data to create custom-branded presentations.
        </p>
      )
    },
    {
      id: 'faq-5',
      question: 'Is my client\'s Twitter data secure?',
      answer: (
        <>
          <p>Yes, we take data security very seriously:</p>
          <ul>
            <li>Your client's data is encrypted during upload and processing</li>
            <li>We never share data with third parties</li>
            <li>The tweets.js file is processed temporarily and not permanently stored</li>
            <li>We don't require access to your clients' Twitter accounts or passwords</li>
            <li>Our analysis is performed locally on secure servers</li>
          </ul>
          <p>You can read our full <a href="/privacy">Privacy Policy</a> for more details.</p>
        </>
      )
    },
    {
      id: 'faq-6',
      question: "Can I resell the reports to my clients?",
      answer: (
        <p>
          Absolutely! Many agencies use Twitilytics reports as a value-added service for their clients. Some charge 
          for Twitter audits as a standalone service (typically $100-300), while others include the reports as part of their 
          monthly retainer packages to justify their social media management fees. The reports are designed to be 
          client-ready with professional visualizations and actionable insights that showcase your agency's expertise.
        </p>
      )
    },
    {
      id: 'faq-7',
      question: "Is there a discount for bulk report purchases?",
      answer: (
        <p>
          We're currently developing agency plans with volume discounts for bulk report purchases. In the meantime, 
          the $9 per-report price is already significantly lower than the cost of manual reporting (which typically takes 
          3-5 billable hours per client), providing excellent ROI for agencies even without bulk discounts. Sign up for our 
          agency newsletter to be the first to know when bulk pricing becomes available.
        </p>
      )
    },
    {
      id: 'faq-8',
      question: "What's included in the $9 client analysis?",
      answer: (
        <>
          <p>Our comprehensive client report includes:</p>
          <ul>
            <li>Executive Summary of Twitter performance</li>
            <li>Activity Analysis (posting patterns, frequency, timing)</li>
            <li>Engagement Analysis (likes, retweets, replies, trends)</li>
            <li>Topic Analysis (what subjects perform best)</li>
            <li>Media Analysis (photos, videos, their impact)</li>
            <li>Monthly Trends (performance over time)</li>
            <li>Content Recommendations (AI-generated suggestions)</li>
            <li>Downloadable PDF Report</li>
          </ul>
          <p>All for a one-time payment of $9 per client report, not a subscription.</p>
        </>
      )
    },
    {
      id: 'faq-9',
      question: 'How long does the analysis take?',
      answer: (
        <p>
          The analysis typically takes 2-5 minutes per client, depending on the size of their Twitter archive.
          Once complete, the report is immediately available to view online, and you can download 
          it as a PDF to share with your client or keep in your records.
        </p>
      )
    },
    {
      id: 'faq-10',
      question: 'Do you offer agency support?',
      answer: (
        <p>
          Yes! We offer priority support for agencies. You can reach our agency support team at 
          <a href="mailto:agency@twitilytics.com"> agency@twitilytics.com</a> with any questions about using Twitilytics 
          for your clients. We typically respond within 24 hours, and we're always happy to schedule a call to discuss 
          your specific needs or provide guidance on how to maximize Twitilytics for your agency workflow.
        </p>
      )
    },
    {
      id: 'faq-11',
      question: 'Do you offer refunds?',
      answer: (
        <p>
          Yes! We offer a 100% money-back guarantee if you're not satisfied with any client report.
          Just contact our support team within 7 days of your purchase, and we'll process your
          refund with no questions asked.
        </p>
      )
    },
    {
      id: 'faq-12',
      question: "What if I have a question that's not answered here?",
      answer: (
        <p>
          We're happy to help! You can reach our agency support team at 
          <a href="mailto:agency@twitilytics.com"> agency@twitilytics.com</a> or use the 
          live chat feature in the bottom right corner of this page. We typically respond
          within 24 hours.
        </p>
      )
    },
    {
      id: 'faq-13',
      question: 'How does analyzing by username work?',
      answer: (
        <>
          <p>Analyzing by username is a feature that allows you to analyze any public Twitter profile without needing their archive file:</p>
          <ul>
            <li>Simply enter the Twitter username (handle) of any public profile</li>
            <li>We fetch publicly available tweets from that profile</li>
            <li>You can analyze from 1,000 to 100,000 tweets (in 1,000-tweet blocks)</li>
            <li>The retrieved data is then processed through our same comprehensive analysis engine</li>
            <li>You get the same detailed report as with an archive file upload</li>
          </ul>
          <p>This is perfect for analyzing competitors, potential clients, or any public profile where you don't have access to their Twitter archive.</p>
        </>
      )
    },
    {
      id: 'faq-14',
      question: 'Is analyzing by username more expensive than uploading a file? Why?',
      answer: (
        <>
          <p>Yes, analyzing by username costs $2 per 1,000 tweets vs. $9 for a complete archive analysis. Here's why:</p>
          <ul>
            <li>This method requires real-time API calls to fetch data from Twitter</li>
            <li>This covers the costs of the direct data retrieval service we use.</li>
            <li>Archive files can contain years of tweets for one fixed price</li>
            <li>This analysis type is priced per volume to cover the external service costs</li>
          </ul>
          <p>However, this method is still cost-effective for analyzing specific profiles without archive access. For example, analyzing 5,000 tweets costs just $10, which is comparable to the archive analysis price.</p>
        </>
      )
    },
    {
      id: 'faq-15',
      question: 'What are the limits on analyzing by username?',
      answer: (
        <>
          <p>Our 'analyze by username' service has the following limits:</p>
          <ul>
            <li>Minimum: 1,000 tweets (1 block)</li>
            <li>Maximum: 100,000 tweets (100 blocks)</li>
            <li>Only public profiles can be analyzed</li>
            <li>Protected/private accounts cannot be accessed</li>
            <li>Analysis typically takes 2-10 minutes depending on volume</li>
            <li>Recent tweets are prioritized (newest first)</li>
          </ul>
          <p>These limits ensure reliable service while keeping costs reasonable for agencies.</p>
        </>
      )
    },
    {
      id: 'faq-16',
      question: 'Is analyzing public profiles by username compliant with Twitter\'s terms?',
      answer: (
        <>
          <p>Yes, our 'analyze by username' service is designed to be compliant:</p>
          <ul>
            <li>We only access publicly available data that anyone can see on Twitter</li>
            <li>No authentication or login credentials are required</li>
            <li>We use an established infrastructure for retrieving public data.</li>
            <li>The service respects rate limits and operates responsibly.</li>
            <li>We only retrieve public data for legitimate business analysis purposes.</li>
          </ul>
          <p>This is similar to how social media monitoring tools access public data. However, we recommend using archive uploads when possible as they provide the most complete data and best value.</p>
        </>
      )
    },
  ];

  return (
    <section className="section faq-section" id="faq">
      <div className="container">
        <SharedSectionHeader
          title="Agency FAQs"
          subtitle="Common questions about using Twitilytics."
          theme="light"
        />
        
        <div className="faq-container">
          {faqs.map(faq => (
            <div key={faq.id} className="faq-item">
              <div 
                className="faq-question" 
                onClick={() => toggleItem(faq.id)}
              >
                {faq.question}
                <button className="btn-ghost faq-toggle">
                  {expandedItems[faq.id] ? '−' : '+'}
                </button>
              </div>
              
              {expandedItems[faq.id] && (
                <div className="faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;