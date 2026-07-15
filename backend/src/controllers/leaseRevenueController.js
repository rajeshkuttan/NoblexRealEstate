'use strict';

const revenueService = require('../services/leaseRevenue/leaseRevenue.service');
const approvalService = require('../services/leaseRevenue/leaseRevenueApproval.service');
const postingService = require('../services/leaseRevenue/leaseRevenuePosting.service');
const amendmentService = require('../services/leaseRevenue/leaseRevenueAmendment.service');
const terminationService = require('../services/leaseRevenue/leaseRevenueTermination.service');
const reconciliationService = require('../services/leaseRevenue/leaseRevenueReconciliation.service');
const dashboardService = require('../services/leaseRevenue/leaseRevenueDashboard.service');
const reportService = require('../services/leaseRevenue/leaseRevenueReport.service');

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

async function getSettings(req, res) {
  try {
    sendOk(res, await revenueService.getSettings(req), 'Settings');
  } catch (err) {
    sendError(res, err);
  }
}

async function updateSettings(req, res) {
  try {
    sendOk(res, await revenueService.updateSettings(req, req.body), 'Settings updated');
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

async function listSchedules(req, res) {
  try {
    sendOk(res, await revenueService.listSchedules(req, req.query), 'Schedules');
  } catch (err) {
    sendError(res, err);
  }
}

async function getSchedule(req, res) {
  try {
    sendOk(res, await revenueService.getSchedule(req, req.params.id), 'Schedule');
  } catch (err) {
    sendError(res, err);
  }
}

async function createSchedule(req, res) {
  try {
    sendOk(res, await revenueService.createSchedule(req, req.body), 'Schedule created', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function updateSchedule(req, res) {
  try {
    sendOk(res, await revenueService.updateSchedule(req, req.params.id, req.body), 'Schedule updated');
  } catch (err) {
    sendError(res, err);
  }
}

async function deleteSchedule(req, res) {
  try {
    sendOk(res, await revenueService.deleteSchedule(req, req.params.id), 'Schedule deleted');
  } catch (err) {
    sendError(res, err);
  }
}

async function cloneSchedule(req, res) {
  try {
    sendOk(res, await revenueService.cloneSchedule(req, req.params.id), 'Schedule cloned', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function generateFromLease(req, res) {
  try {
    const leaseId = req.body.leaseId ?? req.body.lease_id ?? req.params.leaseId;
    sendOk(res, await revenueService.generateFromLease(req, leaseId, req.body), 'Schedule generated from lease', 201);
  } catch (err) {
    sendError(res, err);
  }
}

async function generateSchedule(req, res) {
  try {
    sendOk(res, await revenueService.generateSchedule(req, req.params.id), 'Schedule generated');
  } catch (err) {
    sendError(res, err);
  }
}

async function regenerateSchedule(req, res) {
  try {
    sendOk(res, await revenueService.regenerateSchedule(req, req.params.id), 'Schedule regenerated');
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

async function terminate(req, res) {
  try {
    sendOk(res, await terminationService.terminateSchedule(req, req.params.id, req.body), 'Terminated');
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
  getSettings,
  updateSettings,
  getPostingQueue,
  createPostingBatch,
  processPostingBatch,
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  cloneSchedule,
  generateFromLease,
  generateSchedule,
  regenerateSchedule,
  submit,
  approve,
  reject,
  activate,
  terminate,
  cancel,
  postLines,
  postLine,
  reverseLine,
  repostLine,
  createAmendment,
  approveAmendment,
  rejectAmendment,
  reconcile,
  resolveReconciliation,
};
