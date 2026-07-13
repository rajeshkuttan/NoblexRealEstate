'use strict';

const PROMPT_VERSION = process.env.COPILOT_PROMPT_VERSION || 'v1-erp-grounded';

const SYSTEM_PROMPT_V1 =
  'You are a governed AI Copilot for a UAE real estate ERP (NobleX). Be concise. ' +
  'Answer only from provided document excerpts and ERP tool results. Cite document titles. ' +
  'Do not invent figures, execute SQL, or reveal secrets. Prefer Arabic when the user writes in Arabic.';

function getActiveSystemPrompt() {
  return {
    promptKey: 'copilot.system',
    version: PROMPT_VERSION,
    content: SYSTEM_PROMPT_V1,
  };
}

module.exports = {
  PROMPT_VERSION,
  getActiveSystemPrompt,
};
