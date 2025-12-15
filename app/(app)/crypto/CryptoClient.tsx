// app/(app)/crypto/CryptoClient.tsx
'use client'

import React, { useState, useMemo, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation' // <-- 1. IMPORTED ROUTER
import {
  DollarSign, // CHANGED: Replaced Bitcoin
  Plus,
  Search,
  Calendar,
  ChevronDown,
  Loader2,
  ExternalLink,
  Lock,
  Settings,
  BarChart2,
  TrendingUp,
  Receipt,
  PiggyBank,
  X,
  AlertTriangle,
  Calculator, // ADDED: For converter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ToastProvider'
import clsx from 'clsx'

// Import the types you defined (now USD-based)
import {
  CryptoTransaction,
  CryptoKpis,
  CryptoFilters,
  LivePrices, // This will be unused now, but we keep the import
  MonthSummary,
  PortfolioDistribution,
  TransactionType,
  Asset,
  TRANSACTION_TYPES,
  ALL_ASSETS,
} from '@/lib/crypto.types'

// *** 2. IMPORTED SERVER ACTIONS ***
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  updateInitialCapital,
  addMonthSummaryEntry,
} from './actions'

// Import components
import CryptoTable from '@/components/crypto/CryptoTable'
import {
  CryptoTransactionModal,
  CryptoDeleteConfirm,
} from '@/components/crypto/CryptoModals'

/*
|--------------------------------------------------------------------------
| Constants & Helpers
|--------------------------------------------------------------------------
*/

const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

// *** FIXED: Format as USD ***
const formatCurrencyUSD = (value: number | undefined | null) => {
  if (value === undefined || value === null) value = 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const getYearMonth = (isoDate: string) => isoDate.substring(0, 7)

const formatMonthLabel = (yearMonth: string) => {
  if (!yearMonth) return 'Invalid Month'
  const [year, month] = yearMonth.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

const getCurrentYearMonth = () => {
  return new Date().toISOString().substring(0, 7)
}

/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/

interface CryptoClientProps {
  initialCapital: number
  initialMonthHistory: MonthSummary[]
  initialTransactions: CryptoTransaction[]
}

export default function CryptoClient({
  initialCapital: initialCapitalProp,
  initialMonthHistory: initialMonthHistoryProp,
  initialTransactions: initialTransactionsProp,
}: CryptoClientProps) {
  const [isPending, startTransition] = useTransition()
  const { notify } = useToast()
  const router = useRouter() // <-- 3. INITIALIZED ROUTER

  // --- Core Data State ---
  // These props will be updated by router.refresh()
  const [initialCapital, setInitialCapital] =
    useState<number>(initialCapitalProp)
  const [transactions, setTransactions] =
    useState<CryptoTransaction[]>(initialTransactionsProp)
  const [monthHistory, setMonthHistory] =
    useState<MonthSummary[]>(initialMonthHistoryProp)

  // Sync state if props change (e.g., on router.refresh())
  useEffect(() => {
    setInitialCapital(initialCapitalProp)
  }, [initialCapitalProp])

  useEffect(() => {
    setTransactions(initialTransactionsProp)
  }, [initialTransactionsProp])

  useEffect(() => {
    setMonthHistory(initialMonthHistoryProp)
  }, [initialMonthHistoryProp])

  // --- Filter State ---
  const availableMonths = useMemo(() => {
    const closedMonths = monthHistory.map((h) => h.month)
    const txMonths = transactions.map((tx) => getYearMonth(tx.date))
    // Add current month in case there's no data yet
    const allMonths = [...new Set([...closedMonths, ...txMonths, getCurrentYearMonth()])].sort()
    return allMonths
  }, [transactions, monthHistory])

  const [filters, setFilters] = useState<CryptoFilters>({
    month: availableMonths[availableMonths.length - 1] || getCurrentYearMonth(),
    types: [],
    assets: [],
    clientSearch: '',
  })

  // --- Modal State ---
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<CryptoTransaction | null>(null)
  const [txToDelete, setTxToDelete] = useState<CryptoTransaction | null>(null)
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false)
  const [isCloseMonthModalOpen, setIsCloseMonthModalOpen] = useState(false)

  /*
  |--------------------------------------------------------------------------
  | Core Calculation Logic (FIXED FOR USD-ONLY)
  |--------------------------------------------------------------------------
  */

  // This logic correctly implements your monthly roll-over plan
  const capitalBase = useMemo(() => {
    const [year, month] = filters.month.split('-').map(Number)
    if (!year || !month) return initialCapital

    const prevMonthDate = new Date(year, month - 2, 1)
    const prevMonthKey = prevMonthDate.toISOString().substring(0, 7)
    
    // Find the summary for the *previous* month
    const prevMonthSummary = monthHistory.find((h) => h.month === prevMonthKey)

    // LOGIC: If a previous month is found, the new base is that month's base + its net
    if (prevMonthSummary) {
      return prevMonthSummary.capitalBase + prevMonthSummary.net
    }
    
    // LOGIC: If it's the *first* month in history, use the global initial capital
    if (availableMonths.length > 0 && filters.month === availableMonths[0]) {
      return initialCapital
    }
    
    // LOGIC: Fallback for a future month with no history yet
    // Use the most recent closed month's data to roll forward
    const lastMonth = monthHistory.length > 0 ? monthHistory[monthHistory.length - 1] : null
    if(lastMonth && filters.month > lastMonth.month) {
      return lastMonth.capitalBase + lastMonth.net
    }

    // Default to global initial capital if no history exists at all
    return initialCapital
  }, [filters.month, monthHistory, initialCapital, availableMonths])

  const transactionsForMonth = useMemo(() => {
    return transactions
      .filter((tx) => getYearMonth(tx.date) === filters.month)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [transactions, filters.month])

  // ##################################################################
  // ###       THIS IS THE CORRECTED LOGIC (USD/USDT ONLY)          ###
  // ##################################################################
  const calculatedKpis = useMemo((): CryptoKpis => {
    const initialState = {
      // REMOVED: btc balance
      balances: { usdt: 0, cash: capitalBase },
      totals: { fees: 0, marketing: 0 },
    }

    const finalState = transactionsForMonth.reduce((state, tx) => {
      let feeUsd = 0

      // Calculate fee in USD
      if (tx.feeAmount && tx.feeCurrency) {
        if (tx.feeCurrency === 'USD') {
          feeUsd = tx.feeAmount
        } else if (tx.feeCurrency === 'USDT') {
          feeUsd = tx.feeAmount * 1 // Assume 1 USDT = 1 USD
        }
        // REMOVED: BTC fee logic
      }

      state.totals.fees += feeUsd
      state.balances.cash -= feeUsd // Pay all fees from cash balance

      switch (tx.type) {
        case 'Deposit Cash':
          state.balances.cash += tx.totalUsd
          break
        case 'Withdraw Cash':
          state.balances.cash -= tx.totalUsd
          break
        case 'Marketing Expense':
          state.balances.cash -= tx.totalUsd
          state.totals.marketing += tx.totalUsd
          break
        
        // --- LOGIC FIX: "Buy BTC" and "Sell BTC" are REMOVED ---
        // We only care about USDT
          
        case 'Buy USDT':
          state.balances.usdt += tx.amount // This is the USDT amount
          state.balances.cash -= tx.totalUsd
          break
        case 'Sell USDT':
          state.balances.usdt -= tx.amount // This is the USDT amount
          state.balances.cash += tx.totalUsd
          break
      }

      return state
    }, initialState)

    // YOUR CORRECT ΚΡΙ LOGIC
 // Portfolio Value is only stable assets: USDT + Cash (USD)
 const portfolioValue =
 finalState.balances.usdt *1 + finalState.balances.cash
 // Net is based on this stable portfolio value
 const netThisMonth =
 portfolioValue -
 capitalBase
 // --- END CORRECT ΚΡΙ LOGIC ---

    return {
      capitalBase: capitalBase,
      portfolioValue: portfolioValue,
      netThisMonth: netThisMonth,
      feesThisMonth: finalState.totals.fees,
      marketingThisMonth: finalState.totals.marketing,
      distribution: {
        btc: 0, // No longer tracked
        usdt: finalState.balances.usdt,
        cash: finalState.balances.cash,
      },
    }
  }, [transactionsForMonth, capitalBase]) // REMOVED: livePrices dependency
  // ##################################################################
  // ###              END OF CORRECTED LOGIC SECTION                ###
  // ##################################################################

  const filteredTableTransactions = useMemo(() => {
    return transactionsForMonth.filter((tx) => {
      if (
        filters.types.length > 0 &&
        !filters.types.includes(tx.type)
      ) {
        return false
      }
      if (
        filters.assets.length > 0 &&
        !filters.assets.includes(tx.asset)
      ) {
        return false
      }
      if (filters.clientSearch) {
        const query = filters.clientSearch.toLowerCase()
        const clientMatch = tx.client.toLowerCase().includes(query)
        const cityMatch = (tx.city || '').toLowerCase().includes(query)
        if (!clientMatch && !cityMatch) {
          return false
        }
      }
      return true
    })
  }, [transactionsForMonth, filters])

  /*
  |--------------------------------------------------------------------------
  | Handlers
  |--------------------------------------------------------------------------
  */

  const handleFilterChange = (
    key: keyof CryptoFilters,
    value: string | string[]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // *** REMOVED: handlePriceChange function is no longer needed ***

  // --- CRUD Handlers (These are correct) ---

  const handleSaveTransaction = (tx: CryptoTransaction) => {
    startTransition(async () => {
      const isEditing = !!tx.id
      const action = isEditing ? updateTransaction : createTransaction
      
      const payload = isEditing ? tx : (({ id, ...rest }) => rest)(tx)
      
      const result = await action(payload as any)

      if (result.success) {
        notify({ 
          title: isEditing ? 'Transaction Updated' : 'Transaction Created', 
          variant: 'success' 
        })
        setIsTxModalOpen(false)
        setEditingTx(null)
        router.refresh() // <-- REFRESH DATA FROM SERVER
      } else {
        notify({ 
          title: 'Save Failed', 
          description: result.error || 'Could not save transaction', 
          variant: 'danger' 
        })
      }
    })
  }

  const handleDeleteTransaction = () => {
    if (!txToDelete) return
    startTransition(async () => {
      const result = await deleteTransaction(txToDelete.id)
      
      if (result.success) {
        notify({ title: 'Transaction Deleted', variant: 'success' })
        setTxToDelete(null)
        router.refresh() // <-- REFRESH DATA FROM SERVER
      } else {
         notify({ 
          title: 'Delete Failed', 
          description: result.error || 'Could not delete transaction', 
          variant: 'danger' 
        })
      }
    })
  }

  const handleSaveInitialCapital = (newAmount: number) => {
    startTransition(async () => {
      const result = await updateInitialCapital(newAmount)
      if (result.success) {
        notify({ title: 'Initial Capital Updated', variant: 'success' })
        setIsCapitalModalOpen(false)
        router.refresh() // <-- REFRESH DATA
      } else {
        notify({ title: 'Error', description: result.error, variant: 'danger' })
      }
    })
  }

  const handleConfirmCloseMonth = () => {
    startTransition(async () => {
      const newSummary: MonthSummary = {
        month: filters.month,
        capitalBase: calculatedKpis.capitalBase,
        portfolioValueAtClose: calculatedKpis.portfolioValue,
        fees: calculatedKpis.feesThisMonth,
        marketing: calculatedKpis.marketingThisMonth,
        net: calculatedKpis.netThisMonth,
      }

      const result = await addMonthSummaryEntry(newSummary)

      if (result.success) {
        setIsCloseMonthModalOpen(false)
        notify({
          title: `Month ${formatMonthLabel(filters.month)} Closed`,
          description: 'Net profit rolled into next month',
          variant: 'success',
        })

        const [year, month] = filters.month.split('-').map(Number)
        const nextMonthDate = new Date(year, month, 1)
        const nextMonthKey = nextMonthDate.toISOString().substring(0, 7)
        
        router.refresh() 
        setFilters((prev) => ({ ...prev, month: nextMonthKey, clientSearch: '' }))

      } else {
        notify({ title: 'Error Closing Month', description: result.error, variant: 'danger' })
      }
    })
  }

  // --- Modal Openers ---
  const handleOpenNewTx = () => {
    setEditingTx(null)
    setIsTxModalOpen(true)
  }

  const handleOpenEditTx = (tx: CryptoTransaction) => {
    setEditingTx(tx)
    setIsTxModalOpen(true)
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */
  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 font-sans text-[28px] font-bold text-[var(--text-primary)]">
              <DollarSign size={28} /> {/* CHANGED */}
              Crypto Capital (USD) {/* CHANGED */}
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Track your USDT deals, capital base, and monthly net
            </p>
          </div>
          <Button onClick={handleOpenNewTx} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            New Transaction
          </Button>
        </div>

        {/* 2. Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Filters */}
          <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[300px]">
            {/* Month Selector */}
            <div className="relative">
              <select
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                className={clsx(inputBaseClass, 'appearance-none pr-8 font-medium')}
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthLabel(month)}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
            </div>
            {/* Client Search Filter */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder="Search by Client or City..."
                value={filters.clientSearch}
                onChange={(e) =>
                  handleFilterChange('clientSearch', e.target.value)
                }
                className={clsx(inputBaseClass, 'pl-9')}
              />
            </div>
          </div>

          {/* Right: External Links (FIXED STYLING) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              asChild
              className="text-[var(--info)] border-[var(--info)]/50 hover:bg-[var(--info)]/10 hover:text-[var(--info)]"
            >
              <Link href="https://coinmarketcap.com" target="_blank">
                CoinMarketCap
                <ExternalLink size={14} className="ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="text-[var(--info)] border-[var(--info)]/50 hover:bg-[var(--info)]/10 hover:text-[var(--info)]"
            >
              <Link href="https://www.bancentral.gov.do" target="_blank">
                DOP USD Rate (DR)
                <ExternalLink size={14} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* 3. Summary / KPI Row (FIXED) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Capital Base (This Month)"
            value={formatCurrencyUSD(calculatedKpis.capitalBase)}
            icon={PiggyBank}
            color="info"
            tooltip="Starting capital for this month"
          />
          <KpiCard
            title="Current Portfolio Value"
            value={formatCurrencyUSD(calculatedKpis.portfolioValue)}
            icon={TrendingUp}
            color="primary"
            tooltip="Total value of USDT and Cash (USD)"
          />
          <KpiCard
            title="Net This Month (Provisional)"
            value={formatCurrencyUSD(calculatedKpis.netThisMonth)}
            icon={DollarSign}
            color={calculatedKpis.netThisMonth >= 0 ? 'success' : 'danger'}
            tooltip="(Portfolio - Base - Fees - Marketing)"
          />
          <KpiCard
            title="Fees This Month"
            value={formatCurrencyUSD(calculatedKpis.feesThisMonth)}
            icon={Receipt}
            color="warning"
          />
          <KpiCard
            title="Marketing This Month"
            value={formatCurrencyUSD(calculatedKpis.marketingThisMonth)}
            icon={Receipt}
            color="warning"
          />
          {/* Capital Distribution Card (FIXED) */}
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
              <BarChart2 size={18} />
              Capital Distribution
            </h3>
            <ul className="space-y-2 text-sm">
              {/* REMOVED: BTC Row */}
              <li className="flex justify-between">
                <span className="text-[var(--text-secondary)]">USDT</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatCurrencyUSD(calculatedKpis.distribution.usdt)}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Cash (USD)</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatCurrencyUSD(calculatedKpis.distribution.cash)}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. Capital & Price Controls (FIXED) */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)]">
          {/* Left: Capital Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <span className="text-[var(--text-secondary)]">
                Global Initial Capital:{' '}
              </span>
              <strong className="text-[var(--text-primary)]">
                {formatCurrencyUSD(initialCapital)}
              </strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCapitalModalOpen(true)}
            >
              <Settings size={14} className="mr-2" />
              Edit Initial Capital
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCloseMonthModalOpen(true)}
              disabled={
                isPending ||
                monthHistory.some((h) => h.month === filters.month)
              }
            >
              <Lock size={14} className="mr-2" />
              {monthHistory.some((h) => h.month === filters.month)
                ? 'Month is Closed'
                : 'Close Month'}
            </Button>
          </div>
          
          {/* Right: NEW CONVERTER TOOL (REMOVED) */}
        </div>

        {/* 5. Main Table (FIXED LAYOUT) */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)] lg:col-span-3">
          <h3 className="mb-4 font-sans text-lg font-semibold text-[var(--text-primary)]">
            Transactions for {formatMonthLabel(filters.month)}
          </h3>
          <CryptoTable
            transactions={filteredTableTransactions}
            livePrices={{ btc: 0 }} // Pass empty/dummy prop as it's no longer used
            onEdit={handleOpenEditTx}
            onDelete={(tx) => setTxToDelete(tx)}
            isPending={isPending}
          />
        </div>

        {/* 6. Monthly History (FIXED LAYOUT) */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)] lg:col-span-3">
          <h3 className="mb-4 font-sans text-lg font-semibold text-[var(--text-primary)]">
            Monthly Net History
          </h3>
          <div className="h-full max-h-[400px] overflow-y-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--bg-muted)]">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium uppercase text-[var(--text-secondary)]">
                    Month
                  </th>
                  <th className="px-3 py-2 text-xs font-medium uppercase text-[var(--text-secondary)]">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {monthHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-4 text-center text-[var(--text-tertiary)]"
                    >
                      No closed months
                    </td>
                  </tr>
                )}
                {monthHistory.map((hist) => (
                  <tr key={hist.month}>
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                      {formatMonthLabel(hist.month)}
                    </td>
                    <td
                      className={clsx(
                        'px-3 py-2 font-medium',
                        hist.net >= 0
                          ? 'text-[var(--success)]'
                          : 'text-[var(--danger)]'
                      )}
                    >
                      {formatCurrencyUSD(hist.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/*--------------------------------------------------------------------
        Modals
      ---------------------------------------------------------------------*/}

      <CryptoTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={editingTx}
        isSaving={isPending}
      />

      <CryptoDeleteConfirm
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDeleteTransaction}
        isPending={isPending}
        transaction={txToDelete}
      />

      <InitialCapitalModal
        isOpen={isCapitalModalOpen}
        onClose={() => setIsCapitalModalOpen(false)}
        onSave={handleSaveInitialCapital}
        currentCapital={initialCapital}
        isSaving={isPending}
      />

      <CloseMonthModal
        isOpen={isCloseMonthModalOpen}
        onClose={() => setIsCloseMonthModalOpen(false)}
        onConfirm={handleConfirmCloseMonth}
        monthLabel={formatMonthLabel(filters.month)}
        kpis={calculatedKpis}
        isPending={isPending}
      />
    </>
  )
}

/*
|--------------------------------------------------------------------------
| Local Sub-Components (KPI Card, Local Modals)
|--------------------------------------------------------------------------
*/

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  tooltip,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger'
  tooltip?: string
}) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    secondary: 'text-[var(--secondary)]',
    success: 'text-[var(--success)]',
    info: 'text-[var(--info)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]',
  }
  return (
    <div
      className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]"
      title={tooltip}
    >
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)]',
            colorMap[color]
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <div>
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </div>
          <div className="font-sans text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Local Modal for Initial Capital (FIXED) ---

function InitialCapitalModal({
  isOpen,
  onClose,
  onSave,
  currentCapital,
  isSaving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (newAmount: number) => void
  currentCapital: number
  isSaving: boolean
}) {
  const [amount, setAmount] = useState(currentCapital)

  useEffect(() => {
    if (isOpen) {
      setAmount(currentCapital)
    }
  }, [isOpen, currentCapital])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(amount)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  Edit Initial Capital
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X size={20} />
                </Button>
              </div>
              <div className="space-y-4 p-6">
                <p className="text-sm text-[var(--text-secondary)]">
                  Set the global starting capital in USD. This is used to
                  calculate the base for your very first month.
                </p>
                <div>
                  <label
                    htmlFor="initial_capital"
                    className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                  >
                    Initial Capital (USD)
                  </label>
                  <input
                    id="initial_capital"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className={inputBaseClass}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// --- Local Modal for Closing Month (FIXED) ---

function CloseMonthModal({
  isOpen,
  onClose,
  onConfirm,
  monthLabel,
  kpis,
  isPending,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  monthLabel: string
  kpis: CryptoKpis
  isPending: boolean
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
              <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                Close Month: {monthLabel}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X size={20} />
              </Button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                You are about to close this month. The final net profit/loss
                will be rolled into the next month's capital base.
              </p>
              <div className="space-y-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <InfoRow
                  label="Capital Base"
                  value={formatCurrencyUSD(kpis.capitalBase)}
                />
                <InfoRow
                  label="Portfolio Value (at Close)"
                  value={formatCurrencyUSD(kpis.portfolioValue)}
                />
                <InfoRow
                  label="Total Fees"
                  value={`- ${formatCurrencyUSD(kpis.feesThisMonth)}`}
                />
                <InfoRow
                  label="Total Marketing"
                  value={`- ${formatCurrencyUSD(kpis.marketingThisMonth)}`}
                />
                <hr className="my-2 border-[var(--border-subtle)]" />
                <InfoRow
                  label="Final Calculated Net"
                  value={formatCurrencyUSD(kpis.netThisMonth)}
                  valueClass={
                    kpis.netThisMonth >= 0
                      ? 'text-[var(--success)]'
                      : 'text-[var(--danger)]'
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="bg-[var(--info)] hover:bg-[var(--info)]/90"
              >
                {isPending ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Lock size={16} className="mr-2" />
                )}
                Confirm and Close Month
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Helper for the modal
function InfoRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={clsx('font-medium text-[var(--text-primary)]', valueClass)}>
        {value}
      </span>
    </div>
  )
}
