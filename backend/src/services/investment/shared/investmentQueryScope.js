'use strict';

/**
 * Shared list filters for Investment module Phase 16+.
 */
function includeTestData(req) {
  const v = req.query?.includeTestData ?? req.query?.include_test_data;
  return v === '1' || v === 'true' || v === true;
}

function testDataWhere(req, aliasField = 'isTestData') {
  if (includeTestData(req)) return {};
  return { [aliasField]: false };
}

function parsePagination(query = {}, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || defaultLimit;
  if (limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    totalItems: total,
    currentPage: page,
    itemsPerPage: limit,
  };
}

function parseSort(query = {}, allowed = [], defaultSort = [['id', 'DESC']]) {
  const sortBy = query.sortBy || query.sort;
  const sortDir = String(query.sortDir || query.order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  if (sortBy && allowed.includes(sortBy)) {
    return [[sortBy, sortDir]];
  }
  return defaultSort;
}

module.exports = {
  includeTestData,
  testDataWhere,
  parsePagination,
  paginationMeta,
  parseSort,
};
