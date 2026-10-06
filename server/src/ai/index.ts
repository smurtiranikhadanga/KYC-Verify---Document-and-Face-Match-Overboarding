import { IAIService } from './ai.interface.js';
import { MockAIService } from './mock-ai.service.js';
import { FuturePythonAIService } from './future-python-ai.service.js';

let aiInstance: IAIService;

export function getAIService(): IAIService {
  if (!aiInstance) {
    if (process.env.USE_PYTHON_AI === 'true' || process.env.AI_SERVICE_URL) {
      aiInstance = new FuturePythonAIService(process.env.AI_SERVICE_URL);
    } else {
      aiInstance = new MockAIService();
    }
  }
  return aiInstance;
}

export * from './ai.interface.js';
export * from './mock-ai.service.js';
export * from './future-python-ai.service.js';
export * from './decision.service.js';
