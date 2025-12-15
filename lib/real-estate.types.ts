// lib/real-estate.types.ts

// High-level discriminators
export type RealEstateClientType = 'buyer' | 'seller'
export type RealEstateStatus = 'active' | 'sold'

/**
 * Core record used across:
 * - Table view
 * - Details drawer/modal
 * - Edit form
 *
 * This is the shape returned by actions and stored in state
 * in RealEstateClient.
 */
export interface RealEstateDeal {
  // Primary identifier
  id: string

  // Core client info
  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null

  /**
   * Buyer or Seller.
   * Used for the "Type" column and filters.
   */
  clientType: RealEstateClientType

  /**
   * Date for the opportunity / contact.
   * Stored as a date-like string (e.g. YYYY-MM-DD or ISO),
   * used for the "Date" column and date range filters.
   */
  date: string

  /**
   * Property address shown in:
   * - Table column
   * - Details view
   */
  propertyAddress: string

  /**
   * Property value (amount they intend to sell for or buy).
   * Used in the "Property value" column and details view.
   */
  propertyValue: number

  /**
   * Commission percent (entered manually in the form).
   * e.g. 5 for 5% or 5.5 for 5.5%
   */
  commissionPercent: number

  /**
   * Active vs Sold.
   * Used for the "Active / Sold" filter and "Mark sold" action.
   */
  status: RealEstateStatus

  /**
   * Free-form notes about the deal / client.
   * Shown in the details view.
   */
  notes?: string | null
}

/**
 * Optional helper type for the form components.
 * You can use this for RealEstateForm props if you prefer
 * a separate input shape from the full RealEstateDeal.
 */
export interface RealEstateFormValues {
  id?: string

  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null
  clientType: RealEstateClientType

  date: string
  propertyAddress: string
  propertyValue: number
  commissionPercent: number

  status: RealEstateStatus
  notes?: string | null
}
