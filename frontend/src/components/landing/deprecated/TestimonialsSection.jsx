import React from 'react';
import { HashLink } from 'react-router-hash-link';

/**
 * Testimonials Section Component
 * 
 * This section showcases testimonials from satisfied agency users to build
 * trust and social proof for potential agency and SMM customers.
 */
const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      content: "Twitilytics has saved our agency at least 3 hours per client on Twitter reporting. The PDF reports are professional enough to send straight to clients, and the insights help us justify our social media strategy recommendations.",
      author: "Jennifer Martinez",
      title: "Digital Agency Owner",
      avatar: "/images/testimonials/jennifer.png"
    },
    {
      id: 2,
      content: "As a freelance social media manager with 8 clients, I need efficient tools to maximize my billable hours. Twitilytics gives me in-depth Twitter analysis for each client in minutes, helping me deliver better results while spending less time on reporting.",
      author: "Marcus Chen",
      title: "Freelance SMM",
      avatar: "/images/testimonials/marcus.png"
    },
    {
      id: 3,
      content: "Our marketing agency added Twitter audits as a standalone service using Twitilytics. We charge $297 per audit, and our cost is just $9. Clients love the insights, and it's become a reliable lead generator for our full social media management packages.",
      author: "Priya Shah",
      title: "Marketing Agency Founder",
      avatar: "/images/testimonials/priya.png"
    },
    {
      id: 4,
      content: "The client presentation feature has been a game-changer for our quarterly reviews. We can export professional reports that showcase our Twitter management success, which has significantly improved our client retention rate.",
      author: "David Wilson",
      title: "Social Media Director",
      avatar: "/images/testimonials/david.jpg"
    },
    {
      id: 5,
      content: "I was skeptical about AI analysis tools, but Twitilytics delivers real value for my agency. The insights are actually actionable, and my team saves hours on each client report. When white-labeling becomes available, it will be absolutely perfect.",
      author: "Emma Rodriguez",
      title: "Boutique Agency Owner",
      avatar: "/images/testimonials/emma.jpg"
    },
    {
      id: 6,
      content: "We manage Twitter for 23 clients, and Twitilytics has standardized our reporting process completely. What used to take a junior account manager two days now takes under an hour for all clients combined. The ROI is incredible.",
      author: "James Thompson",
      title: "Social Media Agency CEO",
      avatar: "/images/testimonials/james.jpg"
    }
  ];

  return (
    <section className="section testimonials-section" id="testimonials">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            What Agencies & SMMs Say
          </h2>
          <p className="section-subtitle">
            See how agencies, social media managers, and freelancers use Twitilytics to save time, 
            impress clients, and grow their business:
          </p>
        </div>
        
        <div className="testimonial-grid">
          {testimonials.slice(0, 3).map(testimonial => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="testimonial-content">
                "{testimonial.content}"
              </div>
              <div className="testimonial-author">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author} 
                  className="testimonial-avatar"
                />
                <div className="testimonial-info">
                  <h4>{testimonial.author}</h4>
                  <p>{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="stats-container mt-8">
          <div className="stat-item">
            <span className="stat-number">500+</span>
            <span className="stat-label">Agencies Using Twitilytics</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-number">10,000+</span>
            <span className="stat-label">Client Reports Generated</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-number">4.9/5</span>
            <span className="stat-label">Agency Satisfaction Rate</span>
          </div>
        </div>
        
        <div className="pricing-testimonial mt-8">
          <blockquote>
            "We've been able to increase our client retainer fees by 15% by including the Twitilytics reports in our monthly deliverables. The insights make us look like Twitter geniuses, and clients can clearly see the progress we're making with their accounts."
          </blockquote>
          <div className="testimonial-author">
            <img 
              src="/images/testimonials/alex.png" 
              alt="Alex Morgan" 
              className="testimonial-avatar"
            />
            <div className="testimonial-info">
              <h4>Alex Morgan</h4>
              <p>Agency Growth Consultant</p>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <HashLink smooth to="#file-upload" className="btn btn-primary btn-lg">
            Try It For Your Clients
          </HashLink>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;