// supabase/functions/hello/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello from Functions!")

serve(async (req) => {
  const { method } = req

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      },
    })
  }

  try {
    // Simple ping/pong response
    const responseData = {
      message: "pong",
      timestamp: new Date().toISOString(),
      method: method,
      status: "success"
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: "error"
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
})