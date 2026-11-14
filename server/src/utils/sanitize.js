/**
 * sanitize.js — Security Input Sanitization Helpers
 *
 * Provides:
 *  - escapeRegex: Escapes special characters in user input before passing to RegExp
 *    to prevent Regular Expression Denial of Service (ReDoS) and regex injection.
 *  - sanitizeString: Trims and enforces safe length bounds on free-text fields.
 */

/**
 * Escapes special regex characters in a user-provided search string.
 * Characters escaped: . * + ? ^ $ { } ( ) | [ ] \
 *
 * @param {string} str - Raw user input
 * @returns {string} Sanitized string safe for new RegExp() or MongoDB $regex
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Trims and limits max length of user string input.
 *
 * @param {string} str - Input string
 * @param {number} [maxLength=1000] - Maximum allowed length
 * @returns {string} Trimmed and truncated string
 */
function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

module.exports = {
  escapeRegex,
  sanitizeString,
};
