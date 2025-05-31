'use client'

import React, { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation' // Will be needed later
import { useBorrower } from '@/contexts/BorrowerContext'
import { supabase } from '@/lib/supabase'

// Define a type for the offer structure
interface Offer {
  product_id: string;
  lender_name: string;
  product_name: string;
  interest_rate_min: number;
  processing_fee_value?: number;
  processing_fee_type?: string;
  loan_amount: number;
  estimated_emi: number;
  tenure_years?: number; // Defaulted in edge function, added for completeness
  // Add other relevant offer fields here based on match_products output if needed
}

export default function OffersPage() {
  // const router = useRouter()
  const { draft } = useBorrower()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const borrowerId = draft?.borrower_id;

  useEffect(() => {
    if (!borrowerId) {
      setError("Borrower ID not found. Cannot fetch offers.");
      setLoading(false);
      console.error("OffersPage: Borrower ID is missing from context.");
      // Optionally, redirect to onboarding or show a more user-friendly message
      // router.push('/onboarding');
      return;
    }

    const fetchOffers = async () => {
      setLoading(true);
      setError(null);
      console.log(`Fetching offers for borrower_id: ${borrowerId}`);

      try {
        const { data: functionResponse, error: rpcError } = await supabase.functions.invoke('match_offers', {
          body: { borrower_id: borrowerId }
        });

        if (rpcError) {
          console.error('Error calling match_offers function:', rpcError);
          setError(`Failed to fetch offers: ${rpcError.message}`);
          setOffers([]); // Clear any existing offers
        } else if (functionResponse && functionResponse.offers) {
          console.log('Received offers:', functionResponse.offers);
          setOffers(functionResponse.offers);
          if (functionResponse.offers.length === 0) {
            // setError("No offers found matching your profile at this time."); // Or just show the empty state
            console.log("No offers found for this borrower.");
          }
        } else {
          console.warn('match_offers function returned unexpected data:', functionResponse);
          setError("Received unexpected data from offers service.");
          setOffers([]);
        }
      } catch (e: any) {
        console.error('Exception when fetching offers:', e);
        setError(`An unexpected error occurred: ${e.message}`);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [borrowerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="text-center">
          {/* You can use a spinner component here */}
          <p className="text-lg font-semibold text-gray-700">Loading offers...</p>
          <p className="text-sm text-gray-500">Please wait while we find the best options for you.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h2 className="mt-2 text-xl font-semibold text-red-700">Oops! Something went wrong.</h2>
          <p className="mt-1 text-sm text-gray-600">{error}</p>
          <p className="mt-2 text-sm text-gray-500">
            Please try refreshing the page. If the problem persists, contact support.
          </p>
          {/* Optional: Add a button to retry or go home */}
          {/* <Button onClick={() => window.location.reload()} className="mt-4">Refresh Page</Button> */}
        </div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="mt-2 text-xl font-semibold text-gray-800">No Offers Available</h2>
          <p className="mt-1 text-sm text-gray-500">
            We couldn't find any loan offers matching your current profile at this time.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            You might want to adjust your application details or check back later.
          </p>
          {/* Optional: Add a button to go back to onboarding or contact support */}
          {/* <Button onClick={() => router.push('/onboarding')} className="mt-4">Update Application</Button> */}
        </div>
      </div>
    );
  }

  // If loading is false, no error, and offers exist, render the offers list
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">Your Loan Offers</h1>
        <p className="text-center text-gray-600 mt-2">
          Here are the loan offers based on your profile.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offers.map((offer) => (
          <div key={offer.product_id} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-1">{offer.lender_name}</h2>
            <p className="text-lg text-indigo-600 font-semibold mb-3">{offer.product_name}</p>

            <div className="space-y-2 text-sm text-gray-700">
              <p>Loan Amount: <span className="font-semibold text-gray-900">₹{offer.loan_amount?.toLocaleString('en-IN')}</span></p>
              <p>Interest Rate: <span className="font-semibold text-gray-900">{offer.interest_rate_min?.toFixed(2)}% p.a.</span></p>
              <p>Estimated EMI: <span className="font-semibold text-gray-900">₹{offer.estimated_emi?.toLocaleString('en-IN')}</span></p>
              {offer.tenure_years && (
                <p>Tenure: <span className="font-semibold text-gray-900">{offer.tenure_years} years</span></p>
              )}
              {offer.processing_fee_value && (
                <p>
                  Processing Fee: <span className="font-semibold text-gray-900">
                    {offer.processing_fee_type === 'percentage'
                      ? `${offer.processing_fee_value}%`
                      : `₹${offer.processing_fee_value.toLocaleString('en-IN')}`}
                  </span>
                </p>
              )}
            </div>
            {/* Placeholder for a "View Details" or "Apply Now" button */}
            {/* <Button className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700">View Details</Button> */}
          </div>
        ))}
      </div>
    </div>
  )
}
