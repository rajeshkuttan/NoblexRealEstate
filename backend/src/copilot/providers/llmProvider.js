const { getCopilotConfig, isProviderConfigured } = require('../config/copilotConfig');
const { logCopilot } = require('../observability/copilotLogger');
const { estimateCostUsd } = require('../observability/costEstimator');
const { getActiveSystemPrompt } = require('../prompts/promptRegistry');
const { llmBreaker } = require('./circuitBreaker');

const NOT_CONFIGURED_MESSAGE =
  'The AI Copilot provider is not configured yet. Conversations are saved; document retrieval and leasing tools still run when possible. Set OPENAI_API_KEY or Azure OpenAI for synthesized answers.';

const CIRCUIT_OPEN_MESSAGE =
  'The AI provider is temporarily unavailable (circuit open). Your message was saved; try again shortly. Tool and document results may still be available.';

function buildOpenAiMessages(messages) {
  const prompt = getActiveSystemPrompt();
  return [
    { role: 'system', content: prompt.content },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

function withCostAndPrompt(result) {
  const prompt = getActiveSystemPrompt();
  const estimatedCostUsd = estimateCostUsd({
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    modelName: result.modelName,
  });
  const enriched = {
    ...result,
    promptVersion: prompt.version,
    estimatedCostUsd,
  };
  if (result.totalTokens || result.promptTokens) {
    logCopilot('info', 'llm_usage', {
      modelProvider: result.modelProvider,
      modelName: result.modelName,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd,
      promptVersion: prompt.version,
      streamed: Boolean(result.streamed),
    });
  }
  return enriched;
}

/**
 * @param {{ messages: Array<{ role: string, content: string }> }} params
 */
async function completeChat({ messages }) {
  const cfg = getCopilotConfig();
  if (!isProviderConfigured()) {
    return withCostAndPrompt({
      content: NOT_CONFIGURED_MESSAGE,
      modelProvider: 'stub',
      modelName: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      configured: false,
    });
  }

  if (!llmBreaker.canRequest()) {
    logCopilot('warn', 'llm_circuit_open', llmBreaker.status());
    return withCostAndPrompt({
      content: CIRCUIT_OPEN_MESSAGE,
      modelProvider: 'circuit-open',
      modelName: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      configured: true,
      circuitOpen: true,
    });
  }

  try {
    if (cfg.defaultProvider === 'openai' && cfg.openaiApiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.COPILOT_OPENAI_MODEL || 'gpt-4o-mini',
          messages: buildOpenAiMessages(messages),
          temperature: 0.2,
          max_tokens: 800,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        llmBreaker.recordFailure();
        logCopilot('error', 'openai_chat_failed', { status: res.status, errText: errText.slice(0, 300) });
        return withCostAndPrompt({
          content:
            'The AI provider returned an error. Your message was saved. Please try again later or contact an administrator.',
          modelProvider: 'openai',
          modelName: process.env.COPILOT_OPENAI_MODEL || 'gpt-4o-mini',
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          configured: true,
        });
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || 'No response generated.';
      const usage = data.usage || {};
      llmBreaker.recordSuccess();
      return withCostAndPrompt({
        content,
        modelProvider: 'openai',
        modelName: data.model || process.env.COPILOT_OPENAI_MODEL || 'gpt-4o-mini',
        promptTokens: usage.prompt_tokens ?? null,
        completionTokens: usage.completion_tokens ?? null,
        totalTokens: usage.total_tokens ?? null,
        configured: true,
      });
    }
  } catch (err) {
    llmBreaker.recordFailure();
    logCopilot('error', 'provider_exception', { error: err.message });
  }

  return withCostAndPrompt({
    content: NOT_CONFIGURED_MESSAGE,
    modelProvider: 'stub',
    modelName: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    configured: false,
  });
}

/**
 * Stream chat completion. Calls onDelta(textChunk) as tokens arrive.
 * Falls back to completeChat (single delta) when streaming unavailable.
 */
async function streamChat({ messages, onDelta }) {
  const cfg = getCopilotConfig();
  const emit = typeof onDelta === 'function' ? onDelta : () => {};

  if (!isProviderConfigured() || cfg.defaultProvider !== 'openai' || !cfg.openaiApiKey) {
    const fallback = await completeChat({ messages });
    if (fallback.content) emit(fallback.content);
    return fallback;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.COPILOT_OPENAI_MODEL || 'gpt-4o-mini',
        messages: buildOpenAiMessages(messages),
        temperature: 0.2,
        max_tokens: 800,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const fallback = await completeChat({ messages });
      if (fallback.content) emit(fallback.content);
      return fallback;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            content += delta;
            emit(delta);
          }
        } catch (_) {
          /* ignore partial JSON */
        }
      }
    }

    if (!content) {
      const fallback = await completeChat({ messages });
      if (fallback.content) emit(fallback.content);
      return fallback;
    }

    return withCostAndPrompt({
      content,
      modelProvider: 'openai',
      modelName: process.env.COPILOT_OPENAI_MODEL || 'gpt-4o-mini',
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      configured: true,
      streamed: true,
    });
  } catch (err) {
    logCopilot('error', 'openai_stream_failed', { error: err.message });
    const fallback = await completeChat({ messages });
    if (fallback.content) emit(fallback.content);
    return fallback;
  }
}

module.exports = {
  completeChat,
  streamChat,
  NOT_CONFIGURED_MESSAGE,
};
