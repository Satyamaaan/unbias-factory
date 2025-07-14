import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FilterCriteria {
  maxInterestRate: number
  minLoanAmount: number
  maxLoanAmount: number
  maxProcessingFee: number
  lenderType: string[]
  sortBy: 'interest_rate' | 'processing_fee' | 'emi'
  sortOrder: 'asc' | 'desc'
}

interface OffersFiltersProps {
  filters: FilterCriteria
  onFiltersChange: (filters: FilterCriteria) => void
  onReset: () => void
  totalOffers: number
  filteredOffers: number
}

export function OffersFilters({ 
  filters, 
  onFiltersChange, 
  onReset, 
  totalOffers, 
  filteredOffers 
}: OffersFiltersProps) {
  
  const handleFilterChange = (key: keyof FilterCriteria, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const handleLenderTypeToggle = (lenderType: string) => {
    const updatedTypes = filters.lenderType.includes(lenderType)
      ? filters.lenderType.filter(type => type !== lenderType)
      : [...filters.lenderType, lenderType]
    
    handleFilterChange('lenderType', updatedTypes)
  }

  const lenderTypes = [
    'Private Sector Bank',
    'Public Sector Bank', 
    'NBFC-HFC',
    'Cooperative Bank'
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Filter Offers</CardTitle>
          <div className="text-sm text-gray-600">
            {filteredOffers} of {totalOffers} offers
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Interest Rate Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Interest Rate: {filters.maxInterestRate}%
          </label>
          <input
            type="range"
            min="6"
            max="15"
            step="0.25"
            value={filters.maxInterestRate}
            onChange={(e) => handleFilterChange('maxInterestRate', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>6%</span>
            <span>15%</span>
          </div>
        </div>

        {/* Loan Amount Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loan Amount Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Min (₹ Lakhs)</label>
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={filters.minLoanAmount / 100000}
                onChange={(e) => handleFilterChange('minLoanAmount', parseFloat(e.target.value) * 100000)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Max (₹ Lakhs)</label>
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={filters.maxLoanAmount / 100000}
                onChange={(e) => handleFilterChange('maxLoanAmount', parseFloat(e.target.value) * 100000)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Processing Fee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Processing Fee: ₹{filters.maxProcessingFee.toLocaleString()}
          </label>
          <input
            type="range"
            min="0"
            max="100000"
            step="5000"
            value={filters.maxProcessingFee}
            onChange={(e) => handleFilterChange('maxProcessingFee', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>₹0</span>
            <span>₹1L</span>
          </div>
        </div>

        {/* Lender Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lender Type
          </label>
          <div className="flex flex-wrap gap-2">
            {lenderTypes.map((type) => (
              <Badge
                key={type}
                variant={filters.lenderType.includes(type) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleLenderTypeToggle(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="interest_rate">Interest Rate</option>
              <option value="processing_fee">Processing Fee</option>
              <option value="emi">EMI Amount</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="asc">Low to High</option>
              <option value="desc">High to Low</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        <Button 
          onClick={onReset} 
          variant="outline" 
          className="w-full"
        >
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  )
}