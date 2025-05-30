import React from 'react';

/**
 * Shared Email Form Component
 *
 * @param {object} props
 * @param {function} props.onSubmit - Function to call on form submission.
 * @param {string} props.email - Current email value.
 * @param {function} props.onEmailChange - Handler for email input changes.
 * @param {boolean} props.isSubmitting - True if the form is currently submitting.
 * @param {string|null} props.errorMessage - Error message to display.
 * @param {string} props.submitButtonText - Text for the submit button.
 * @param {string} [props.cancelButtonText='Cancel'] - Text for the cancel button.
 * @param {function} [props.onCancel] - Handler for cancel button click.
 * @param {string} [props.placeholder='Your email address'] - Placeholder for the email input.
 * @param {string} [props.formClassName=''] - Additional class names for the form.
 * @param {'light' | 'dark'} [props.theme='dark'] - Theme for styling.
 * @param {string} [props.submitButtonClassName='btn btn-accent btn-md'] - Class for submit button.
 * @param {string} [props.cancelButtonClassName='btn btn-ghost btn-md'] - Class for cancel button.
 * @param {boolean} [props.stackButtons=false] - If true, buttons will stack vertically.
 */
const SharedEmailForm = ({
  onSubmit,
  email,
  onEmailChange,
  isSubmitting,
  errorMessage,
  submitButtonText,
  cancelButtonText = 'Cancel',
  onCancel,
  placeholder = 'Your email address',
  formClassName = '',
  theme = 'dark',
  submitButtonClassName = 'btn btn-accent btn-md',
  cancelButtonClassName = 'btn btn-ghost btn-md',
  stackButtons = false,
}) => {
  const themeClass = theme === 'light' ? 'shared-email-form--light' : '';
  const buttonContainerClass = stackButtons ? 'shared-email-form__buttons--column' : '';


  return (
    <form onSubmit={onSubmit} className={`shared-email-form ${themeClass} ${formClassName}`}>
      <div className="shared-email-form__group">
        <input
          type="email"
          value={email}
          onChange={onEmailChange}
          placeholder={placeholder}
          required
          disabled={isSubmitting}
          className="shared-email-form__input"
        />
      </div>

      {errorMessage && (
        <div className="shared-email-form__error">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className={`shared-email-form__buttons ${buttonContainerClass}`}>
        <button
          type="submit"
          className={submitButtonClassName}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Joining...' : submitButtonText}
        </button>

        {onCancel && (
          <button
            type="button"
            className={cancelButtonClassName}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelButtonText}
          </button>
        )}
      </div>
    </form>
  );
};

export default SharedEmailForm;