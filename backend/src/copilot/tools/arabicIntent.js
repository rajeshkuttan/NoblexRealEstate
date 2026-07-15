'use strict';

/**
 * Map common Arabic ERP phrases to English intent cues so heuristic routers work bilingually.
 */
const ARABIC_TO_EN = [
  [/وحدات\s*شاغرة|شاغرة|شاغر/g, ' vacant units '],
  [/نسبة\s*الإشغال|الإشغال|اشغال/g, ' occupancy rate '],
  [/عقود\s*تنتهي|انتهاء\s*العقود|تجديد/g, ' leases expiring renewal '],
  [/إيجار\s*متأخر|متأخرات|متأخر/g, ' overdue rent '],
  [/التحصيل|تحصيل\s*الإيجار/g, ' rent collection '],
  [/الإيراد\s*الشهري|الإيرادات\s*الشهرية|إيرادات\s*شهرية|إيراد\s*شهري/g, ' monthly revenue '],
  [/الإيراد|الإيرادات/g, ' revenue '],
  [/أعمار\s*الذمم|الذمم\s*المدينة/g, ' receivable aging '],
  [/تأمينات|وديعة\s*تأمينية|الودائع/g, ' security deposit '],
  [/السيولة|الرصيد\s*النقدي|النقد/g, ' cash position '],
  [/حسابات\s*بنكية|أرصدة\s*البنوك/g, ' bank account balances '],
  [/محفظة\s*الاستثمار|الاستثمارات|استثمار/g, ' investment portfolio '],
  [/استحقاق\s*الاستثمار|استحقاقات/g, ' investment maturing '],
  [/ملخص\s*التأجير|تقرير\s*التأجير\s*اليومي/g, ' daily leasing brief '],
  [/مخاطر\s*التحصيل/g, ' collection risk brief '],
  [/العقارات|محافظ\s*العقارات/g, ' property portfolio '],
  [/مستأجر/g, ' tenant '],
  [/وحدة/g, ' unit '],
  [/عقار/g, ' property '],
  [/عقد\s*إيجار|إيجار/g, ' lease '],
];

function normalizeQueryForIntent(query) {
  let q = String(query || '');
  for (const [pattern, replacement] of ARABIC_TO_EN) {
    q = q.replace(pattern, replacement);
  }
  return q;
}

module.exports = { normalizeQueryForIntent };
