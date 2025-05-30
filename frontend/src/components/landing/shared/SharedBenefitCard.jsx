import React from 'react';

/**
 * Shared Benefit Card Component
 *
 * @param {object} props
 * @param {React.ReactNode} props.icon - The icon element for the benefit card.
 * @param {string} props.title - The title for the benefit card.
 * @param {string} props.description - The description for the benefit card.
 * @param {string} [props.className] - Additional class names for the container.
 */
const SharedBenefitCard = ({ icon, title, description, className = '' }) => {
  return (
    <div className={`shared-benefit-card ${className}`}>
      <div className="shared-benefit-card__icon">
        {icon}
      </div>
      <h3 className="shared-benefit-card__title">
        {title}
      </h3>
      <p className="shared-benefit-card__description">
        {description}
      </p>
    </div>
  );
};

export default SharedBenefitCard;