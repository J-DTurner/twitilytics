DO THESE MODIFICATIONS. GO TO THE FILES LISTED AND EXECUTE THE TASK(S) ASSIGNED.

File: C:\Users\Administrator\Documents\twitilytics\frontend\src\styles\shared\shared-email-form.css
Content:
```css
/* C:\Users\Administrator\Documents\twitilytics\frontend\src\styles\shared\shared-email-form.css */

.shared-email-form {
  margin-top: 2rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.shared-email-form__group {
  margin-bottom: 1rem;
}

.shared-email-form__input {
  background: rgba(255, 255, 255, 0.9); /* Default for dark form background */
  color: var(--dark);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--border-radius);
  padding: var(--space-md);
  width: 100%;
  font-size: var(--font-size-md);
}

.shared-email-form__input::placeholder {
  color: var(--secondary);
}

.shared-email-form__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(244, 93, 34, 0.2); /* Accent focus ring */
  outline: none;
}

.shared-email-form__error {
  color: var(--error-light); /* Default for dark form background */
  font-size: var(--font-size-sm);
  text-align: center;
  margin-top: var(--space-sm); /* Ensure consistent spacing if error used above buttons */
}

.shared-email-form__buttons {
  margin-top: var(--space-lg); /* mt-4 equivalent */
  text-align: center;
  display: flex; /* For side-by-side buttons if needed */
  gap: var(--space-md); /* Gap between buttons */
  justify-content: center; /* Center buttons if they don't take full width */
}

/* Light theme adjustments (e.g., if used on a light background section) */
.shared-email-form--light .shared-email-form__input {
  background: var(--light);
  color: var(--dark);
  border: 1px solid var(--secondary-lighter);
}

.shared-email-form--light .shared-email-form__input::placeholder {
  color: var(--secondary-light);
}

.shared-email-form--light .shared-email-form__input:focus {
  border-color: var(--primary); /* Primary focus for light theme */
  box-shadow: 0 0 0 3px var(--primary-lighter);
}

.shared-email-form--light .shared-email-form__error {
  color: var(--error); /* Standard error color for light theme */
}

/* Ensure buttons inside form buttons container can be full width if desired by parent */
.shared-email-form__buttons .btn {
  /* Default: buttons take their content width */
}
.shared-email-form__buttons--column .btn {
  width: 100%; /* Example if buttons should stack and be full width */
}
.shared-email-form__buttons--column {
  flex-direction: column; /* Stack buttons */
}

```
INSTRUCTIONS FOR CLAUDE (Non-Interactive Execution):
The task described above is a single, complete unit of work.
If this task involves generating code or a specific file output, save that primary output to a file named 'output.txt' in the current working directory.
Execute this task non-interactively. Do not ask for permissions or confirmation to execute any part of it, including shell commands or file modifications.
Upon successful completion of all aspects of this task (including saving 'output.txt' if applicable), and only then, respond with the exact string "<task_completion_signal>Task Complete</task_completion_signal>" on a new line and nothing else. Do not add any other text, explanation, or formatting before or after "<task_completion_signal>Task Complete</task_completion_signal>".
If you encounter an irrecoverable error that prevents you from completing the task as described, provide a concise error message explaining the failure instead of "<task_completion_signal>Task Complete</task_completion_signal>".

<critical_instructions>
Always put Task Complete on it's own line in the terminal output. Never add any other text, explanation, grammar, or formatting before or after the task completion signal.
</critical_instructions>


---
<task_completion_signal>Task Complete</task_completion_signal>
