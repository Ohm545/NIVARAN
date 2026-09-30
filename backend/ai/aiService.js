/**
 * NIVARAN — AI Service
 *
 * Base wrapper for Azure OpenAI chat completions via the official openai SDK.
 * All AI features in NIVARAN go through this service.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @returns {Promise<string>} — assistant reply text
 */

import { getAzureClient } from './azureClient.js';
import { env }            from '../config/env.js';
import { logger }         from '../utils/logger.js';

export async function chatCompletion(messages, options = {}) {
  const client = getAzureClient();

  const response = await client.chat.completions.create({
    model:       env.azure.deployment,   // deployment name doubles as model for Azure
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens:  options.maxTokens    ?? 1024,
  });

  const reply = response.choices[0]?.message?.content ?? '';
  logger.debug(`[AI] Tokens used: ${response.usage?.total_tokens}`);
  return reply;
}
