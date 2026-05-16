/**
 * Pagination utility functions
 * Enforces maximum limits to prevent performance issues
 */

const MAX_LIMIT = 500; // Maximum records per request
const DEFAULT_LIMIT = 10; // Default records per request

/**
 * Normalize pagination parameters with max limit enforcement
 * @param {Object} query - Request query parameters
 * @param {number} defaultLimit - Default limit (default: 10)
 * @param {number} maxLimit - Maximum allowed limit (default: 500)
 * @returns {Object} Normalized pagination parameters
 */
function normalizePagination(query = {}, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
  const page = Math.max(1, parseInt(query.page) || 1);
  let limit = parseInt(query.limit) || defaultLimit;
  
  // Enforce maximum limit
  if (limit > maxLimit) {
    limit = maxLimit;
  }
  
  // Ensure limit is positive
  if (limit < 1) {
    limit = defaultLimit;
  }
  
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset,
    maxLimit
  };
}

/**
 * Create pagination metadata for response
 * @param {number} total - Total number of records
 * @param {number} page - Current page
 * @param {number} limit - Records per page
 * @returns {Object} Pagination metadata
 */
function createPaginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    pages: totalPages,
    totalItems: total,
    currentPage: page,
    itemsPerPage: limit,
    totalPages,
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
}

module.exports = {
  normalizePagination,
  createPaginationMeta,
  MAX_LIMIT,
  DEFAULT_LIMIT
};
