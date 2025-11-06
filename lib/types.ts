// lib/types.ts

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

export const LEAD_STAGES = ['lead', 'discovery', 'delivery', 'paid'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

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

export const LOCATION_TYPES = ['online', 'in_person'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const CURRENCIES = ['USD', 'DOP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_CHANNELS = ['in_person', 'online'] as const;
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

export const MARKETING_CHANNELS = [
  'organic',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'google_ads',
  'radio/tv',
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

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

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

export const PREFERRED_CHANNELS = [
  'whatsapp',
  'phone',
  'email',
  'other',
] as const;
export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number];

// --- Dashboard Types (for app/(app)/page.tsx) ---

export interface BusinessKpis {
  revenue: number;
  leads: number;
  closes: number;
  attendance: number;
}

export interface PipelineStage {
  name: string;
  count: number;
  conversionRate: number;
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
  visa: { active: number; atRisk: number };
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

// --- Core Data Models (from Section 3 of My Business Software.pdf) ---

export interface Contact {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  preferredChannel: PreferredChannel;
  referralSourceText?: string | null;
  referralContactId?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  createdAt: string; // ISO string
}

export interface Lead {
  id: string;
  contactId: string;
  serviceType: ServiceType;
  sourceChannel: MarketingChannel;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  notes?: string | null;
  currentStage: LeadStage;
  stageTs: Record<LeadStage, string>; // { lead: '...', discovery: '...' }
  expectedValue?: number | null;
  serviceMeta?: Record<string, any> | null; // e.g., { classMode: 'online' }
  createdAt: string; // ISO string

  // --- Mock data for UI ---
  // We'll add related data directly for the UI-only phase
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
}

export interface Payment {
  id: string;
  leadId?: string | null;
  classPackageId?: string | null;
  amount: number;
  currency: Currency;
  amountUsd: number;
  amountDop: number;
  method: PaymentMethod;
  dateReceived: string; // YYYY-MM-DD
  channel: PaymentChannel;
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

export interface Project {
  id: string;
  leadId: string;
  projectType: ProjectType;
  scopeSummary?: string | null;
  status: ProjectStatus;
  repoUrl?: string | null;
  stagingUrl?: string | null;
  prodUrl?: string | null;
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

export interface ClassStudent {
  id: string;
  contactId: string;
  language: ClassLanguage;
  mode: LocationType;
  groupType: GroupType;
  timezone?: string | null;
  level?: ClassLevel | null;
  goals?: string | null;
}

export interface ClassPackage {
  id: string;
  studentId: string;
  packageName: string;
  sessionsIncluded: number;
  sessionsConsumed: number;
  priceTotal: number;
  currency: Currency;
  status: PackageStatus;
  startDate?: string | null; // YYYY-MM-DD
  expiryDate?: string | null; // YYYY-MM-DD
}

export interface ClassSession {
  id: string;
  studentId?: string | null;
  groupId?: string | null;
  dateTime: string; // ISO string
  durationMin: number;
  attendance: AttendanceStatus;
  notes?: string | null;
  homeworkAssigned?: string | null;
}

export interface VisaCase {
  id: string;
  leadId: string;
  caseType: string;
  // For UI-only, we'll simplify jsonb fields
  checklists?: { name: string; required: boolean; completed: boolean }[];
  dueDates?: Record<string, string>; // { 'I-130 Submission': '2025-12-01' }
  riskNotes?: string | null;
  statusTimeline?: { status: string; at: string }[];
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