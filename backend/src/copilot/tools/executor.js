'use strict';

const { CopilotToolRun } = require('../../models');
const { getTool } = require('./registry');
const { selectLeasingTools, selectTools } = require('./intentRouter');

function hasPermission(userPermissions, code) {
  const list = Array.isArray(userPermissions) ? userPermissions : [];
  return list.includes(code);
}

/**
 * Execute a registered tool with RBAC + company isolation + audit row.
 */
async function executeTool({
  toolName,
  input = {},
  companyId,
  userId,
  userPermissions,
  conversationId = null,
  messageId = null,
}) {
  const started = Date.now();
  const tool = getTool(toolName);
  if (!tool) {
    return {
      status: 'failed',
      errorCode: 'UNKNOWN_TOOL',
      data: null,
      summary: `Unknown tool: ${toolName}`,
    };
  }

  if (!hasPermission(userPermissions, tool.requiredPermission)) {
    await CopilotToolRun.create({
      companyId,
      conversationId,
      messageId,
      userId,
      toolName: tool.name,
      module: tool.module,
      inputJson: input,
      outputSummary: 'Permission denied',
      outputRecordCount: 0,
      permissionCode: tool.requiredPermission,
      status: 'denied',
      latencyMs: Date.now() - started,
      errorCode: 'PERMISSION_DENIED',
    }).catch(() => {});
    return {
      status: 'denied',
      errorCode: 'PERMISSION_DENIED',
      data: null,
      summary: `Missing permission ${tool.requiredPermission}`,
      toolName: tool.name,
    };
  }

  try {
    const data = await tool.handler({ companyId, userId, ...input });
    let recordCount = 0;
    if (Array.isArray(data)) recordCount = data.length;
    else if (data && typeof data === 'object') {
      if (Array.isArray(data.units)) recordCount = data.units.length;
      else if (Array.isArray(data.leases)) recordCount = data.leases.length;
      else if (Array.isArray(data.properties)) recordCount = data.properties.length;
      else recordCount = 1;
    }
    const summary = JSON.stringify(data).slice(0, 1500);
    await CopilotToolRun.create({
      companyId,
      conversationId,
      messageId,
      userId,
      toolName: tool.name,
      module: tool.module,
      inputJson: input,
      outputSummary: summary,
      outputRecordCount: recordCount,
      permissionCode: tool.requiredPermission,
      status: 'success',
      latencyMs: Date.now() - started,
    }).catch(() => {});
    return {
      status: 'success',
      toolName: tool.name,
      data,
      summary,
      recordCount,
    };
  } catch (err) {
    await CopilotToolRun.create({
      companyId,
      conversationId,
      messageId,
      userId,
      toolName: tool.name,
      module: tool.module,
      inputJson: input,
      outputSummary: err.message,
      outputRecordCount: 0,
      permissionCode: tool.requiredPermission,
      status: 'failed',
      latencyMs: Date.now() - started,
      errorCode: 'TOOL_ERROR',
    }).catch(() => {});
    return {
      status: 'failed',
      toolName: tool.name,
      errorCode: 'TOOL_ERROR',
      data: null,
      summary: err.message,
    };
  }
}

module.exports = {
  executeTool,
  selectLeasingTools,
  selectTools,
  hasPermission,
};
