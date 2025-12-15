// lib/types.ts

/* ==================================================================================
   SECTION 1: BUSINESS SOFTWARE CONSTANTS & ENUMS
   ================================================================================== */

// --- Enums & Constants (from Section 13 of My Business Software.pdf) ---

export const SERVICE_TYPES = [
  'website',
  'software',
  'english_class',
  'spanish_class',
  'visa',
  'social_media',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const ACTIVITY_TYPES = [
  'call',
  'whatsapp',
  'email',
  'meeting',
  'note',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_DIRECTIONS = ['in', 'out', 'n/a'] as const;
export type ActivityDirection = (typeof ACTIVITY_DIRECTIONS)[number];

export const CALENDAR_STATUSES = [
  'scheduled',
  'done',
  'no_show/canceled',
] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

// MODIFIED: Matched schema enum
export const LOCATION_TYPES = ['online', 'in_person', 'other'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'transfer',
  'other',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Matches DB enum `public.marketing_channel`
export const MARKETING_CHANNELS = [
  'organic',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'google_ads',
  'radio',
  'tv',
  'referral',
  'other',
] as const;
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const TOUCH_TYPES = [
  'impression',
  'click',
  'form',
  'call',
  'qr',
  'visit',
] as const;
export type TouchType = (typeof TOUCH_TYPES)[number];

export const CLASS_LANGUAGES = ['english', 'spanish'] as const;
export type ClassLanguage = (typeof CLASS_LANGUAGES)[number];

export const GROUP_TYPES = ['private', 'group'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const CLASS_LEVELS = [
  'A1/A2',
  'B1',
  'B2',
  'C1',
  'C2',
  'beginner',
  'intermediate',
  'advanced',
] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

// MODIFIED: Per Fixes doc, statuses are simplified
export const ATTENDANCE_STATUSES = [
  'scheduled',
  'assisted',
  'cancelled',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

// ADDED: New enum for class_student_status
export const CLASS_STUDENT_STATUSES = [
  'active',
  'paused',
  'inactive',
] as const;
export type ClassStudentStatus = (typeof CLASS_STUDENT_STATUSES)[number];

export const PACKAGE_STATUSES = ['active', 'completed', 'expired'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const PROJECT_STATUSES = [
  'planning',
  'in_progress',
  'blocked',
  'done',
  'canceled',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = ['website', 'software'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const MILESTONE_STATUSES = [
  'planned',
  'in_progress',
  'blocked',
  'done',
  'canceled',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const CAMPAIGN_STATUSES = [
  'planning',
  'active',
  'paused',
  'completed',
  'canceled',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CONTENT_STATUSES = [
  'planned',
  'approved',
  'posted',
  'skipped',
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

// Matches DB enum `public.contact_preferred_channel`
export const PREFERRED_CHANNELS = ['whatsapp', 'email'] as const;
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

/* ==================================================================================
   SECTION 2: PERSONAL SOFTWARE TYPES (BUDGET & AGENDA)
   ================================================================================== */

export type EntryType = 'income' | 'expense';

export type Frequency = 'monthly' | 'weekly' | 'biweekly';

// MODIFIED: Removed 'doordash_income' and 'job_income' per instruction
export type Category =
  | 'bill'
  | 'gas'
  | 'groceries'
  | 'loan'
  | 'other'
  | 'subscription'
  | 'business_income';

export type OverrideType = 'paid' | 'postponed' | 'skipped';

// Note: Status is used internally by BudgetLogic but UnifiedRow now uses is_paid boolean primarily.
// Display status ('Paid', 'Overdue', 'Upcoming') is often derived in the UI or snapshot computation.
export type Status = 'Paid' | 'Overdue' | 'Upcoming';

export interface OneTimeEntry {
  id: string;
  user_id: string;
  type: EntryType;
  category: Category;
  description: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  paid_on: string | null; // YYYY-MM-DD
  created_at: string; // ISO Timestamp
}

export interface Rule {
  id: string;
  user_id: string;
  type: EntryType;
  category: Category;
  description: string;
  amount: number;
  frequency: Frequency;
  dom: number | null; // Day of month (1-31)
  dow: number | null; // Day of week (1-7)
  start_anchor: string; // YYYY-MM-DD
  active: boolean;
  created_at: string; // ISO Timestamp
}

export interface Override {
  id: string;
  user_id: string;
  rule_id: string;
  occurrence_date: string; // YYYY-MM-DD
  override_type: OverrideType;
  paid_on: string | null; // YYYY-MM-DD
  new_date: string | null; // YYYY-MM-DD
  created_at: string; // ISO Timestamp
}

// UnifiedRow is the output of computeSnapshot, combining entries and rule occurrences
export interface UnifiedRow {
  id: string; // For one-time entries: entry ID. For recurring: rule ID.
  kind: 'one_time' | 'recurring';
  type: EntryType;
  category: Category; // Derived category
  description: string; // Derived description
  amount: number; // Derived amount
  effective_date: string; // YYYY-MM-DD (The actual date for this instance, after overrides)
  is_paid: boolean; // True if paid_on exists for entry or relevant override
  status?: Status; // Display status ('Paid', 'Overdue', 'Upcoming')
  rule_id: string | null; // Only for recurring kind
  occurrence_date: string | null; // YYYY-MM-DD
  occurrence_id: string | null; // Unique ID for a recurring instance
  due_date: string; // YYYY-MM-DD (Alias for effective_date)
  date: string; // YYYY-MM-DD (Alias for effective_date)
}

export interface Totals {
  total_income: number;
  total_expenses: number;
  remaining_to_pay: number; // Sum of unpaid expenses for the period
}

export interface Snapshot {
  month_start: string; // YYYY-MM-DD
  month_end: string; // YYYY-MM-DD
  totals: Totals;
  rows: UnifiedRow[];
}

/* ==== Added for Dashboard/Agenda props ==== */

// Used by Calendar Actions and Dashboard
export type CalendarEventLite = {
  id: string;
  title: string;
  start_ts: string;       // ISO Timestamp (UTC from DB)
  end_ts: string | null;  // ISO Timestamp (UTC from DB) or null
  kind: 'task' | 'event'; // Matches DB enum 'calendar_event_kind'
  // Matches DB enum 'calendar_event_category'
  category: 'Work' | 'Personal' | 'Health' | 'Errand' | 'Other';
};

// --- UPDATED WeekItem Type (Merged for Personal & Business Dashboards) ---
export type WeekItem = {
  id: string; // Unique ID (Entry ID, Rule Occurrence ID, or Calendar Event ID)
  dateISO: string; // Localized date in ISO format (YYYY-MM-DD)
  title: string;   // Description (Budget) or Title (Calendar)
  source: 'calendar' | 'budget'; // Origin of the item

  // Optional fields for Budget items
  amount?: number;        // Budget item amount

  // Optional fields for Calendar items
  startTime?: string;     // Formatted start time (e.g., "10:00 AM") or ISO string
  endTime?: string | null;// Formatted end time or null
  category?: string;      // Calendar category
  location?: string | null;
  notes?: string | null;
};

/* ==================================================================================
   SECTION 3: BUSINESS SOFTWARE INTERFACES
   ================================================================================== */

// --- Dashboard Types ---

export interface BusinessKpis {
  revenue: number;
  leads: number;
  closes: number;
  attendance: number;
}

export interface RevenueData {
  name: string;
  revenue: number;
}

export interface ChannelData {
  name: string;
  spend: number;
  leads: number;
  closes: number;
  revenue: number;
}

export interface ModuleHealth {
  projects: { onTime: number; blocked: number };
  classes: { active: number; renewals: number };
}

// Renamed from ActivityLog for dashboard clarity
export interface ActivityItem {
  id: string;
  type: ActivityType;
  summary: string;
  timestamp: string; // ISO string
  leadId?: string;
  contactId?: string;
}

// --- Core Data Models ---

export interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string; // ISO string
}

export interface Lead {
  id: string;
  contactId: string;
  serviceType: ServiceType;
  sourceChannel: MarketingChannel;
  notes?: string | null;
  expectedValue?: number | null;
  createdAt?: string; // ISO string
  // --- UI convenience
  contact?: Contact;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  locationType: LocationType;
  locationDetail?: string | null;
  leadId?: string | null;
  classSessionId?: string | null;
  status: CalendarStatus;
  // extendedProps for FullCalendar
  attendance: AttendanceStatus;
  studentId?: string | null;
  packageId?: string | null;
  studentName?: string;
  packageName?: string;
}

// MODIFIED: Matched 'payments' schema
export interface Payment {
  id: string;
  leadId?: string | null;
  studentId?: string | null;
  classPackageId?: string | null; // We will keep this for now, but link to student
  projectId?: string | null;
  amountDopCents: number;
  method: PaymentMethod;
  dateReceived: string; // YYYY-MM-DD
  memo?: string | null;
}

export interface MarketingTouch {
  id: string;
  contactId?: string | null;
  channel: MarketingChannel;
  touchType: TouchType;
  utmSource?: string | null;
  utmCampaign?: string | null;
  cost: number;
  timestamp: string; // ISO string
}

// MODIFIED: Replaced with DB-backed type
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientName: string; // MODIFIED: From new client_name text column
  type: ProjectType; // 'website' | 'software'
  startDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
  budgetDopCents: number; // int8 centavos
  // UI convenience fields from getProjects()
  amountPaidDopCents: number; // Computed
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  status: MilestoneStatus;
  amountLinked?: number | null;
}

// MODIFIED: Matched 'class_students' schema
export interface ClassStudent {
  id: string;
  contactId: string;
  language: ClassLanguage;
  level?: ClassLevel | null;
  goals?: string | null;
  status: ClassStudentStatus; // ADDED
  
  // --- UI convenience (will be populated by server actions)
  contact?: Contact;
  packages?: ClassPackage[];
  sessions?: ClassSession[];
}

// MODIFIED: Matched 'class_packages' schema
export interface ClassPackage {
  id: string;
  studentId: string;
  title: string; // MODIFIED: Was 'packageName'
  sessionsIncluded: number;
  sessionsConsumed: number;
  priceDopCents: number; // MODIFIED: Was 'priceTotal' and 'currency'
  status: PackageStatus;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // MODIFIED: Was 'expiryDate'

  // --- UI convenience (will be populated by server actions)
  student?: ClassStudent;
}

// MODFIED: Matched 'class_sessions' schema
export interface ClassSession {
  id: string;
  studentId?: string | null;
  groupId?: string | null;
  packageId?: string | null; // ADDED
  startTime: string; // MODIFIED: Was 'dateTime'
  endTime: string; // MODIFIED: Was 'durationMin'
  timezone?: string | null; // ADDED
  locationType: LocationType; // ADDED
  locationDetail?: string | null; // ADDED
  attendance: AttendanceStatus; // MODIFIED: Uses new enum values
  notes?: string | null;

  // --- UI convenience (will be populated by server actions)
  student?: ClassStudent;
  package?: ClassPackage;
}

export interface SocialMediaCampaign {
  id: string;
  brandAccount: string;
  channels: MarketingChannel[];
  goals?: string | null;
  budgetTotal?: number | null;
  status: CampaignStatus;
  startDate?: string | null; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
}

export interface ContentCalendarItem {
  id: string;
  campaignId: string;
  channel: MarketingChannel;
  publishDatetime: string; // ISO string
  caption?: string | null;
  status: ContentStatus;
  linkToPost?: string | null;
}