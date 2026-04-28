/**
 * logger.js
 *
 * Debug logging utility. All output is gated by CONFIG.debugMode,
 * except debugError() which always logs regardless of mode.
 */

import { CONFIG } from '../config.js';

const PREFIX = '[MCS]';

/**
 * Logs a named group with optional data.
 * Uses console.table for plain objects, console.log otherwise.
 * Only active when CONFIG.debugMode is true.
 *
 * @param {string} group - Group label
 * @param {*}      data  - Optional data to display
 */
export function debugLog(group, data) {
  if (!CONFIG.debugMode) return;
  console.group(`${PREFIX} ${group}`);
  if (data !== undefined) {
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      console.table(data);
    } else {
      console.log(data);
    }
  }
  console.groupEnd();
}

/**
 * Logs an error group. Always active regardless of debugMode.
 *
 * @param {string} group - Group label
 * @param {*}      error - The error or message to display
 */
export function debugError(group, error) {
  console.group(`${PREFIX} ERROR — ${group}`);
  console.error(error);
  console.groupEnd();
}

/**
 * Starts a named console timer. Only active when CONFIG.debugMode is true.
 *
 * @param {string} label - Timer label
 */
export function debugTime(label) {
  if (!CONFIG.debugMode) return;
  console.time(`${PREFIX} ${label}`);
}

/**
 * Ends a named console timer. Only active when CONFIG.debugMode is true.
 *
 * @param {string} label - Timer label (must match a prior debugTime call)
 */
export function debugTimeEnd(label) {
  if (!CONFIG.debugMode) return;
  console.timeEnd(`${PREFIX} ${label}`);
}
