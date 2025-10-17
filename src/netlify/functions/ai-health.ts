import { Handler } from '@netlify/functions';

const handler: Handler = async () => {
  const apiKey = process.env.AGENTROUTER_API_KEY;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'ok',
      agentRouterConfigured: !!apiKey,
      timestamp: new Date().toISOString(),
    }),
  };
};

export { handler };
