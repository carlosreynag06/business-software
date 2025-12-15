// lib/crypto.types.tsx
// Per your request, this file defines all types for the Crypto module
// Accounting is based on USD only. BTC is removed.

/**
 * Defines the assets that can be transacted
 */
export const CRYPTO_ASSETS = ['USDT'] as const // REMOVED: BTC
export const FIAT_ASSETS = ['USD'] as const 
export const ALL_ASSETS = [...CRYPTO_ASSETS, ...FIAT_ASSETS] as const // UPDATED

export type CryptoAsset = (typeof CRYPTO_ASSETS)[number]
export type FiatAsset = (typeof FIAT_ASSETS)[number]
export type Asset = (typeof ALL_ASSETS)[number]

/**
 * Defines all possible transaction types
 */
export const TRANSACTION_TYPES = [
  // REMOVED: 'Buy BTC', 'Sell BTC'
  'Buy USDT',
  'Sell USDT',
  'Deposit Cash',
  'Withdraw Cash',
  'Marketing Expense',
] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/**
 * The core data structure for a single transaction
 * All currency values are in USD.
 */
export interface CryptoTransaction {
  id: string
  /** ISO string format */
  date: string
  /** The type of transaction */
  type: TransactionType
  /** The primary asset involved (e.g., USDT, USD) */
  asset: Asset
  /** The amount of the primary asset (e.g., 1000 USDT or 5000 USD) */
  amount: number
  /** The price in USD per unit of a crypto asset (REMOVED: BTC logic, but kept for USDT trade record) */
  unitPriceUsd?: number | null // Used to calculate Total USD (Total USD = Amount * Unit Price)
  /** The total USD value of the transaction (Final cost/value. If trade, this is USD spent/received) */
  totalUsd: number
  /** The numeric value of the fee */
  feeAmount?: number | null
  /** The currency the fee was paid in (USDT or USD) */
  feeCurrency?: Asset | null // REMOVED: BTC
  /** Name of the client/vendor involved */
  client: string
  /** Client's phone number */
  phone?: string | null
  /** Client's city */
  city?: string | null
  /** Optional notes */
  notes?: string | null
}

/**
 * Holds the current balances of all assets for portfolio calculation
 * All balances are in their native units (USDT, USD)
 */
export interface PortfolioDistribution {
  btc: 0 // FIXED: BTC is no longer held, set to 0
  usdt: number
  cash: number // This represents USD
}

/**
 * Holds all the main calculated KPIs for the header row
 * All values are in USD.
 */
export interface CryptoKpis {
  /** The starting capital for the selected month */
  capitalBase: number
  /** The current live value of all stable assets (USDT + Cash) */
  portfolioValue: number
  /** (Portfolio - Capital Base - Fees - Marketing) */
  netThisMonth: number
  /** Sum of all transaction fees this month (in USD) */
  feesThisMonth: number
  /** Sum of all 'Marketing Expense' transactions this month (in USD) */
  marketingThisMonth: number
  /** The live balances of all assets */
  distribution: PortfolioDistribution
}

/**
 * Represents the state of the user's filters
 */
export interface CryptoFilters {
  /** The selected month, e.g., "2025-08" */
  month: string
  /** Array of TransactionType enums to show */
  types: TransactionType[]
  /** Array of Asset enums to show */
  assets: Asset[]
  /** Free text search for client or city */
  clientSearch: string
}

/**
 * Represents the manually-entered live prices for BTC
 * This interface is now empty as no live prices are needed for USDT arbitrage.
 */
export interface LivePrices {
  // REMOVED: btc
}

/**
 * A snapshot of a "closed" month's performance
 * Used to build the monthly history table. All values are in USD.
 */
export interface MonthSummary {
  /** Key for the month, e.g., "2025-08" */
  month: string
  capitalBase: number
  portfolioValueAtClose: number
  fees: number
  marketing: number
  net: number
}