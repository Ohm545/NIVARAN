/**
 * NIVARAN — Login Page Module
 *
 * Handles login form submission, validation, loading state,
 * and redirect to dashboard on success.
 */

import { authService } from '../services/auth.service.js';

// ── DOM refs ──────────────────────────────────────────────────

const form           = document.getElementById('login-form');
const emailInput     = document.getElementById('email');
const passwordInput  = document.getElementById('password');
const emailError     = document.getElementById('email-error');
const passwordError  = document.getElementById('password-error');
const alertBox       = document.getElementById('login-alert');
const loginBtn       = document.getElementById('login-btn');
const loginBtnText   = document.getElementById('login-btn-text');
const loginSpinner   = document.getElementById('login-spinner');
const passwordToggle = document.getElementById('password-toggle');
const iconEye        = document.getElementById('icon-eye');
const iconEyeOff     = document.getElementById('icon-eye-off');

// ── Redirect if already authenticated ────────────────────────

if (authService.isLoggedIn()) {
  window.location.replace('app.html');
}

// ── Password show/hide ────────────────────────────────────────

passwordToggle.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  iconEye.classList.toggle('hidden', isHidden);
  iconEyeOff.classList.toggle('hidden', !isHidden);
  passwordToggle.setAttribute('aria-pressed', String(isHidden));
  passwordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

// ── Client-side validation ────────────────────────────────────

function validateForm() {
  let valid = true;

  // Email
  const email = emailInput.value.trim();
  if (!email) {
    showFieldError(emailInput, emailError, 'Email address is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError(emailInput, emailError, 'Enter a valid email address.');
    valid = false;
  } else {
    clearFieldError(emailInput, emailError);
  }

  // Password
  const password = passwordInput.value;
  if (!password) {
    showFieldError(passwordInput, passwordError, 'Password is required.');
    valid = false;
  } else {
    clearFieldError(passwordInput, passwordError);
  }

  return valid;
}

function showFieldError(input, errorEl, message) {
  input.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearFieldError(input, errorEl) {
  input.removeAttribute('aria-invalid');
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
}

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove('hidden');
}

function clearAlert() {
  alertBox.textContent = '';
  alertBox.classList.add('hidden');
}

// ── Loading state ─────────────────────────────────────────────

function setLoading(loading) {
  loginBtn.disabled = loading;
  loginBtnText.textContent = loading ? 'Signing in…' : 'Sign In';
  loginSpinner.classList.toggle('hidden', !loading);
}

// ── Form submission ───────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  if (!validateForm()) return;

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {
    await authService.login(email, password);
    window.location.replace('app.html');
  } catch (err) {
    showAlert(err.message || 'Sign in failed. Please try again.');
  } finally {
    setLoading(false);
  }
});

// Clear field errors on input
emailInput.addEventListener('input',    () => clearFieldError(emailInput,    emailError));
passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));
