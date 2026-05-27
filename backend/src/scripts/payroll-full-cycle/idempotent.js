/**
 * findOrCreate by natural keys (where + defaults).
 * @returns {{ record, created: boolean }}
 */
async function findOrCreate(Model, where, defaults = {}) {
  let record = await Model.findOne({ where });
  if (record) return { record, created: false };
  record = await Model.create({ ...where, ...defaults });
  return { record, created: true };
}

/** Skip async step when predicate is true. */
async function skipIf(already, fn) {
  if (already) return already;
  return fn();
}

module.exports = { findOrCreate, skipIf };
