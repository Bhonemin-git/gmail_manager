import { CONFIG } from '../config';
import { N8nPayload } from '../types/gmail';

export class N8nService {
  static async triggerWorkflow(payload: N8nPayload): Promise<boolean> {
    if (!CONFIG.N8N_WEBHOOK_URL) {
      throw new Error('N8N Webhook URL not configured');
    }

    try {
      const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to trigger n8n workflow:', error);
      return false;
    }
  }
}
