/**
 * NIVARAN — Azure OpenAI Client
 *
 * Uses the official `openai` npm package with AzureOpenAI class.
 * This file is backend-only. Credentials are NEVER sent to the browser.
 */

import { AzureOpenAI } from 'openai';
import { env } from '../config/env.js';

let _client = null;

export function getAzureClient() {
  if (!_client) {
    if (!env.azure.endpoint || !env.azure.apiKey) {
      throw new Error('Azure OpenAI credentials are not configured. Check your .env file.');
    }

    _client = new AzureOpenAI({
      endpoint:    env.azure.endpoint,
      apiKey:      env.azure.apiKey,
      apiVersion:  env.azure.apiVersion,
      deployment:  env.azure.deployment,
    });
  }

  return _client;
}
