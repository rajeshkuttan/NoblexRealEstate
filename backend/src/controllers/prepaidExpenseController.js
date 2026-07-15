'use strict';

const expenseService = require('../services/prepaidExpenses/prepaidExpense.service');
const approvalService = require('../services/prepaidExpenses/prepaidApproval.service');
const postingService = require('../services/prepaidExpenses/prepaidPosting.service');
const amendmentService = require('../services/prepaidExpenses/prepaidAmendment.service');
const reconciliationService = require('../services/prepaidExpenses/prepaidReconciliation.service');
const dashboardService = require('../services/prepaidExpenses/prepaidDashboard.service');
const reportService = require('../services/prepaidExpenses/prepaidReport.service');

function sendError(res, err) {
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message });
}

function sendOk(res, data, message, status = 200) {
  res.status(status).json({ success: true, message, data });
}

async function getDashboard(req, res) {
  try {
    sendOk(res, await dashboardService.getDashboardKpis(req), 'Dashboard KPIs');
  } catch (err) {
    sendError(res, err);
  }
}

async function getReport(req, res) {
  try {
    const result = await reportService.generateReport(req, req.params.type, req.query);
    if (result.contentType === 'application/json') {
      return sendOk(res, result.body.data, 'Report data');
    }
    res.setHeader('Content-Type', result.contentType);
    if (result.filename) res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.body);
  } catch (err) {
    sendError(res, err);
  }
}

async function listCategories(req, res) {
  try {
    sendOk(res, await expenseService.listCategories(req), 'Categories');
  } catch (err) {
    sendError(res, err);
  }
}

async function createCategory(req, res) {
  try {
    sendOk(res, await expenseService.createCategory(req, req.body), 'Category created', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function updateCategory(req, res) {
  try {
    sendOk(res, await expenseService.updateCategory(req, req.params.id, req.body), 'Category updated');
  } catch (err) {
    sendError(res, err);
  }
}

async function deleteCategory(req, res) {
  try {
    sendOk(res, await expenseService.deleteCategory(req, req.params.id), 'Category deleted');
  } catch (err) {
    sendError(res, err);
  }
}

async function getSettings(req, res) {
  try {
    sendOk(res, await expenseService.getSettings(req), 'Settings');
  } catch (err) {
    sendError(res, err);
  }
}

async function updateSettings(req, res) {
  try {
    sendOk(res, await expenseService.updateSettings(req, req.body), 'Settings updated');
  } catch (err) {
    sendError(res, err);
  }
}

async function getPostingQueue(req, res) {
  try {
    sendOk(res, await postingService.getPostingQueue(req, req.query), 'Posting queue');
  } catch (err) {
    sendError(res, err);
  }
}

async function createPostingBatch(req, res) {
  try {
    sendOk(res, await postingService.createPostingBatch(req, req.body), 'Batch created', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function processPostingBatch(req, res) {
  try {
    sendOk(res, await postingService.processPostingBatch(req, req.params.id), 'Batch processed');
  } catch (err) {
    sendError(res, err);
  }
}

async function listPrepaidExpenses(req, res) {
  try {
    sendOk(res, await expenseService.listPrepaidExpenses(req, req.query), 'Prepaid expenses');
  } catch (err) {
    sendError(res, err);
  }
}

async function getPrepaidExpense(req, res) {
  try {
    sendOk(res, await expenseService.getPrepaidExpense(req, req.params.id), 'Prepaid expense');
  } catch (err) {
    sendError(res, err);
  }
}

async function createPrepaidExpense(req, res) {
  try {
    sendOk(res, await expenseService.createPrepaidExpense(req, req.body), 'Prepaid expense created', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function updatePrepaidExpense(req, res) {
  try {
    sendOk(res, await expenseService.updatePrepaidExpense(req, req.params.id, req.body), 'Prepaid expense updated');
  } catch (err) {
    sendError(res, err);
  }
}

async function deletePrepaidExpense(req, res) {
  try {
    sendOk(res, await expenseService.deletePrepaidExpense(req, req.params.id), 'Prepaid expense deleted');
  } catch (err) {
    sendError(res, err);
  }
}

async function clonePrepaidExpense(req, res) {
  try {
    sendOk(res, await expenseService.clonePrepaidExpense(req, req.params.id), 'Prepaid expense cloned', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function generateSchedule(req, res) {
  try {
    sendOk(res, await expenseService.generateSchedule(req, req.params.id), 'Schedule generated');
  } catch (err) {
    sendError(res, err);
  }
}

async function regenerateSchedule(req, res) {
  try {
    sendOk(res, await expenseService.regenerateSchedule(req, req.params.id), 'Schedule regenerated');
  } catch (err) {
    sendError(res, err);
  }
}

async function submit(req, res) {
  try {
    sendOk(res, await approvalService.submit(req, req.params.id), 'Submitted');
  } catch (err) {
    sendError(res, err);
  }
}

async function approve(req, res) {
  try {
    sendOk(res, await approvalService.approve(req, req.params.id, req.body), 'Approved');
  } catch (err) {
    sendError(res, err);
  }
}

async function reject(req, res) {
  try {
    sendOk(res, await approvalService.reject(req, req.params.id), 'Rejected');
  } catch (err) {
    sendError(res, err);
  }
}

async function activate(req, res) {
  try {
    sendOk(res, await approvalService.activate(req, req.params.id), 'Activated');
  } catch (err) {
    sendError(res, err);
  }
}

async function suspend(req, res) {
  try {
    sendOk(res, await approvalService.suspend(req, req.params.id, req.body), 'Suspended');
  } catch (err) {
    sendError(res, err);
  }
}

async function resume(req, res) {
  try {
    sendOk(res, await approvalService.resume(req, req.params.id), 'Resumed');
  } catch (err) {
    sendError(res, err);
  }
}

async function terminate(req, res) {
  try {
    sendOk(res, await approvalService.terminate(req, req.params.id, req.body), 'Terminated');
  } catch (err) {
    sendError(res, err);
  }
}

async function cancel(req, res) {
  try {
    sendOk(res, await approvalService.cancel(req, req.params.id), 'Cancelled');
  } catch (err) {
    sendError(res, err);
  }
}

async function postLines(req, res) {
  try {
    sendOk(res, await postingService.postLines(req, req.params.id, req.body), 'Lines posted');
  } catch (err) {
    sendError(res, err);
  }
}

async function postLine(req, res) {
  try {
    sendOk(res, await postingService.postSingleLine(req, req.params.id, req.params.lineId, req.body), 'Line posted');
  } catch (err) {
    sendError(res, err);
  }
}

async function reverseLine(req, res) {
  try {
    sendOk(res, await postingService.reverseLine(req, req.params.id, req.params.lineId, req.body), 'Line reversed');
  } catch (err) {
    sendError(res, err);
  }
}

async function repostLine(req, res) {
  try {
    sendOk(res, await postingService.repostLine(req, req.params.id, req.params.lineId, req.body), 'Line reposted');
  } catch (err) {
    sendError(res, err);
  }
}

async function replaceAllocations(req, res) {
  try {
    sendOk(res, await expenseService.replaceAllocations(req, req.params.id, req.body.allocations || req.body), 'Allocations updated');
  } catch (err) {
    sendError(res, err);
  }
}

async function createAmendment(req, res) {
  try {
    sendOk(res, await amendmentService.createAmendment(req, req.params.id, req.body), 'Amendment created', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function approveAmendment(req, res) {
  try {
    sendOk(res, await amendmentService.approveAmendment(req, req.params.id), 'Amendment approved');
  } catch (err) {
    sendError(res, err);
  }
}

async function rejectAmendment(req, res) {
  try {
    sendOk(res, await amendmentService.rejectAmendment(req, req.params.id, req.body), 'Amendment rejected');
  } catch (err) {
    sendError(res, err);
  }
}

async function reconcile(req, res) {
  try {
    sendOk(res, await reconciliationService.createReconciliation(req, req.params.id, req.body.asOfDate), 'Reconciliation created', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function resolveReconciliation(req, res) {
  try {
    sendOk(res, await reconciliationService.resolveReconciliation(req, req.params.id, req.body), 'Reconciliation resolved');
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  getDashboard,
  getReport,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSettings,
  updateSettings,
  getPostingQueue,
  createPostingBatch,
  processPostingBatch,
  listPrepaidExpenses,
  getPrepaidExpense,
  createPrepaidExpense,
  updatePrepaidExpense,
  deletePrepaidExpense,
  clonePrepaidExpense,
  generateSchedule,
  regenerateSchedule,
  submit,
  approve,
  reject,
  activate,
  suspend,
  resume,
  terminate,
  cancel,
  postLines,
  postLine,
  reverseLine,
  repostLine,
  replaceAllocations,
  createAmendment,
  approveAmendment,
  rejectAmendment,
  reconcile,
  resolveReconciliation,
};
