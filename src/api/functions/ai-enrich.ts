import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY;
const AGENTROUTER_API_URL = 'https://api.agentrouter.ai/v1/chat/completions';

interface RequestBody {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check API key
  if (!AGENTROUTER_API_KEY) {
    console.error('AGENTROUTER_API_KEY not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    const body: RequestBody = JSON.parse(event.body || '{}');
    const { model = 'gpt-4o', messages, temperature = 0.7, max_tokens = 2000 } = body;

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request: messages array required' }),
      };
    }

    console.log(`AI Request: model=${model}, messages=${messages.length}`);

    // Create timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(AGENTROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AGENTROUTER_API_KEY}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        console.error('AgentRouter error:', response.status, data);
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({
            error: data.error?.message || 'AgentRouter API error',
            code: data.error?.code || response.status,
            details: data,
          }),
        };
      }

      console.log(`AI Response: tokens=${data.usage?.total_tokens || 0}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    } catch (fetchError: any) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout');
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ error: 'Request timeout after 30 seconds' }),
        };
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error('Function error:', error);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Failed to process AI request',
        detail: error.message,
      }),
    };
  }
};

export { handler };
