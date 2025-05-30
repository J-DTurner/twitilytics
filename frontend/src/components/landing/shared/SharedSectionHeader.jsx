import React from 'react';

/**
 * Shared Section Header Component
 *
 * @param {object} props
 * @param {string} props.title - The main title for the section.
 * @param {string} props.subtitle - The subtitle for the section.
 * @param {'light' | 'dark'} [props.theme='light'] - The theme of the section header.
 * @param {string} [props.className] - Additional class names for the container.
 */
const SharedSectionHeader = ({ title, subtitle, theme = 'light', className = '' }) => {
  const themeClass = theme === 'dark' ? 'shared-section-header--dark' : '';

  return (
    <div className={`shared-section-header ${themeClass} ${className}`}>
      <h2 className="shared-section-header__title">
        {title}
      </h2>
      <p className="shared-section-header__subtitle">
        {subtitle}
      </p>
    </div>
  );
};

export default SharedSectionHeader;