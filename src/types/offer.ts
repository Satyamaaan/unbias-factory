export interface Offer {
  product_id: string
  lender_name: string
  product_name: string
  interest_rate_min: number
  processing_fee_value: number
  processing_fee_type: string
  max_ltv_ratio_tier1: number
  loan_amount: number
  estimated_emi: number
  target_borrower_segment?: string[]
  min_loan_amount?: number
  max_loan_amount?: number
}