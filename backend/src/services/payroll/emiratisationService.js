const { Op } = require('sequelize');
const { Employee } = require('../../models');

const UAE_NATIONALITIES = ['UAE', 'United Arab Emirates', 'Emirati'];

async function getEmiratisationMetrics(companyId, { requiredPercent = 2 } = {}) {
  const employees = await Employee.findAll({
    where: { companyId, status: 'active' },
    attributes: ['id', 'nationality', 'uaeNational'],
  });

  const total = employees.length;
  const uaeNationals = employees.filter((e) => {
    if (e.uaeNational) return true;
    const nat = (e.nationality || '').trim();
    return UAE_NATIONALITIES.some((u) => u.toLowerCase() === nat.toLowerCase());
  }).length;

  const actualPercent = total > 0 ? Math.round((uaeNationals / total) * 10000) / 100 : 0;
  const gap = Math.max(0, Number(requiredPercent) - actualPercent);

  return {
    total,
    uae_nationals: uaeNationals,
    required_percent: Number(requiredPercent),
    actual_percent: actualPercent,
    gap,
  };
}

module.exports = { getEmiratisationMetrics, UAE_NATIONALITIES };
