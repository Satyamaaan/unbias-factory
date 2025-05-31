import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { borrower_id } = body;

    if (!borrower_id) {
      return NextResponse.json({ error: 'Missing borrower_id in request body' }, { status: 400 });
    }

    const { data, error: supabaseError } = await supabase.functions.invoke('match_offers', {
      body: { borrower_id },
    });

    if (supabaseError) {
      console.error('Supabase function error:', supabaseError.message);
      // It's good practice to not expose raw Supabase errors directly if they might contain sensitive info.
      // However, for this exercise, we'll forward the message.
      return NextResponse.json({ error: supabaseError.message || 'An error occurred with the Supabase function.' }, { status: 500 });
    }

    // The Supabase function likely returns an object, e.g., { count: number, offers: any[] }
    // We'll return this directly under a 'data' key to match one possible way to structure it.
    // Or, if the 'data' from Supabase is the actual offers object, we can just return it.
    // Let's assume 'data' from supabase.functions.invoke is the payload we want.
    return NextResponse.json({ data });

  } catch (error: any) {
    console.error('API route error:', error.message);
    let errorMessage = 'An unexpected error occurred in the API route.';
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        errorMessage = 'Invalid JSON in request body.';
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    // For other errors, provide a generic message
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
