/**
 * utils.js
 * General-purpose utility functions.
 */

/**
 * Clamp a number between min and max.
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Format a Philippine Peso amount.
 * @param {number} amount
 * @returns {string} e.g. "₱39,999"
 */
export const formatPHP = (amount) =>
  `₱${Number(amount).toLocaleString('en-PH')}`;

/**
 * Scroll to a section by its element ID.
 * @param {string} id
 */
export const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};
