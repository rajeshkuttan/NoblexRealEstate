'use strict';

const {
  buildOccupancyChart,
  buildAgingChart,
  chartFromToolResult,
  artifactsFromToolResults,
} = require('../../copilot/tools/reports/chartSpec');

describe('chartSpec', () => {
  test('occupancy pie', () => {
    const c = buildOccupancyChart({ occupied: 10, available: 5, other: 1 });
    expect(c.type).toBe('pie');
    expect(c.series).toHaveLength(3);
    expect(c.series.find((s) => s.label === 'Occupied').value).toBe(10);
  });

  test('aging bar', () => {
    const c = buildAgingChart({
      amounts: { current: 100, d1_30: 50, d31_60: 20, d61_90: 10, d90_plus: 5 },
    });
    expect(c.type).toBe('bar');
    expect(c.series.some((s) => s.label === '1–30' && s.value === 50)).toBe(true);
  });

  test('chartFromToolResult occupancy', () => {
    const c = chartFromToolResult('getOccupancySummary', {
      occupied: 2,
      available: 1,
      other: 0,
    });
    expect(c).toBeTruthy();
    expect(c.series[0].value).toBe(2);
  });

  test('artifactsFromToolResults', () => {
    const arts = artifactsFromToolResults([
      {
        status: 'success',
        toolName: 'getOccupancySummary',
        data: { occupied: 3, available: 1, other: 0 },
      },
      {
        status: 'success',
        toolName: 'getOverdueRent',
        data: { count: 2, totalOverdue: 1000, invoices: [{ id: 1 }] },
      },
    ]);
    expect(arts.some((a) => a.type === 'chart')).toBe(true);
    expect(arts.some((a) => a.type === 'table' && a.toolName === 'getOverdueRent')).toBe(true);
  });

  test('empty data yields null chart', () => {
    expect(chartFromToolResult('getOccupancySummary', null)).toBeNull();
  });
});
