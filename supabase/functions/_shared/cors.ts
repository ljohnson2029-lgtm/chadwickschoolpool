// Shared CORS configuration for all edge functions
// Only allows requests from approved origins

// Strict allowed origins - update this when deploying to new domains
const ALLOWED_ORIGINS = [
  // Production domains
  'https://chadwickschoolpool.lovable.app',
  'https://id-preview--0448966d-bdd1-486b-a1ee-cd456b9f1300.lovable.app',
  'https://chadwickschoolpool.org',
  'https://www.chadwickschoolpool.org',
  // Local development (Vite default port only)
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  
  // Strict origin checking - only exact matches from allowed list
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}
