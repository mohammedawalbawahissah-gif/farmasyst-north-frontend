// ── Enums / unions ────────────────────────────────────────────────────────────
export type UserRole = 'farmer' | 'investor' | 'consumer' | 'admin';
export type CreditType = 'funding' | 'inputs' | 'training';
export type FlockType =
  | 'broilers' | 'layers'
  | 'guinea_fowl' | 'turkey' | 'duck' | 'geese' | 'ostrich'
  | 'day_old_chicks' | 'hatchery' | 'poultry_and_hatchery'
  | 'meat_processing' | 'mixed';

// ── Pagination wrapper ────────────────────────────────────────────────────────
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_verified: boolean;
  profile_photo: string | null;
  language: 'en' | 'dag';
  date_joined: string;
}

// ── Profiles ─────────────────────────────────────────────────────────────────
export interface FarmerProfile {
  id: number;
  user: User;
  ghana_card_number: string;
  ghana_card_photo: string | null;
  district: string;
  region: string;
  community: string;
  gps_address: string;
  years_of_farming: number;
  verification_status: 'pending' | 'submitted' | 'verified' | 'rejected';
  credit_score: string;
  credit_score_updated_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InvestorProfile {
  id: number;
  user: User;
  organisation: string;
  investor_type: 'bank' | 'off_taker' | 'restaurant' | 'aggregator' | 'ngo';
  registration_number: string;
  max_investment_amount: string;
  preferred_credit_types: CreditType[];
  preferred_regions: string[];
  is_kyc_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ── Farms ─────────────────────────────────────────────────────────────────────
export interface Farm {
  id: string;
  owner: string;
  name: string;
  flock_type: FlockType;
  flock_size: number;
  region: string;
  district: string;
  community: string;
  gps_address: string;
  farm_size_acres: string | null;
  has_water_source: boolean;
  has_electricity: boolean;
  registration_cert: string | null;
  farm_photo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FarmActivityLog {
  id: string;
  farm: string;
  date: string;
  broiler_count:       number;
  layer_count:         number;
  guinea_fowl_count:   number;
  turkey_count:        number;
  duck_count:          number;
  geese_count:         number;
  ostrich_count:       number;
  day_old_chick_count: number;
  flock_count: number;        // read-only computed: sum of above three
  mortality: number;
  feed_kg: string;
  eggs_collected: number;
  medication_given: string;
  notes: string;
  logged_by: string | null;
  created_at: string;
}

export interface FarmAuditReport {
  id: string;
  farm: string;
  auditor: string | null;
  visit_date: string;
  outcome: 'satisfactory' | 'concerns' | 'unsatisfactory';
  flock_verified: number;
  infrastructure_score: number;
  management_score: number;
  biosecurity_score: number;
  report_document: string | null;
  summary: string;
  created_at: string;
}

// ── Credit ────────────────────────────────────────────────────────────────────
export type ApplicationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'scored'
  | 'matched' | 'approved' | 'disbursed' | 'rejected' | 'withdrawn';

// Backend may return nested User objects or plain ID strings depending on endpoint/role
export type UserOrId = User | string;

// Helper — safely extract a display name from a nested user or plain string
export function displayName(val: UserOrId | null | undefined): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  return val.full_name || `${val.first_name} ${val.last_name}`.trim() || val.email;
}

export function userId(val: UserOrId | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.id;
}

export interface CreditApplication {
  id: string;
  reference: string;
  farmer: UserOrId;
  farm: string | null;
  credit_type: CreditType;
  amount_requested: string | null;
  repayment_period_months: number | null;
  purpose: string;
  input_details: string;
  status: ApplicationStatus;
  credit_score_at_submission: string | null;
  reviewer: UserOrId | null;
  reviewer_notes: string;
  rejection_reason: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  matched_investor: string | null;
  created_at: string;
  updated_at: string;
}

export type AgreementStatus =
  | 'pending_signature' | 'active' | 'completed' | 'defaulted' | 'cancelled';

export interface CreditAgreement {
  id: string;
  reference: string;
  application: string;
  investor: UserOrId;
  farmer: UserOrId;
  credit_type: CreditType;
  amount: string;
  repayment_period_months: number;
  interest_rate: string;
  status: AgreementStatus;
  contract_document: string | null;
  farmer_signed_at: string | null;
  investor_signed_at: string | null;
  disbursed_at: string | null;
  completed_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────
export interface RepaymentSchedule {
  id: string;
  agreement: string;
  installment_number: number;
  due_date: string;
  amount_due: string;
  amount_paid: string;
  status: 'upcoming' | 'due' | 'pending' | 'paid' | 'overdue' | 'waived';
  paid_at: string | null;
}

export interface Disbursement {
  id: string;
  reference: string;
  agreement: string;
  amount: string;
  method: string;
  status: string;
  disbursed_by: string;
  gateway_ref: string;
  created_at: string;
}

// ── Training ─────────────────────────────────────────────────────────────────
export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  module_type: 'video' | 'pdf' | 'webinar' | 'workshop';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  is_free: boolean;
  is_published: boolean;
  thumbnail: string | null;
  video_url: string | null;
  document: string | null;
  created_by: string;
  created_at: string;
}

export interface TrainingEnrolment {
  id: string;
  module: string;
  farmer: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  progress_pct: number;
  enrolled_at: string;
  completed_at: string | null;
}

// ── Marketplace ───────────────────────────────────────────────────────────────
export interface Produce {
  id: string;
  seller: string;
  farm: string;
  name: string;
  produce_type: 'broiler' | 'layer' | 'eggs' | 'other';
  quantity: number;
  unit: string;
  price: string;
  description: string;
  status: 'active' | 'sold_out' | 'delisted';
  is_organic: boolean;
  avg_rating: string;
  farm_name: string;
  farm_region: string;
  created_at: string;
}

export interface Order {
  id: string;
  buyer: string;
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  total_amount: string;
  delivery_address: string;
  created_at: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  recipient: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type DisbursementRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DisbursementRequest {
  id: string;
  reference: string;
  agreement: string;
  agreement_reference: string;
  requested_by: string;
  requested_by_name: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  farmer_name: string;
  amount: string;
  method: string;
  note: string;
  status: DisbursementRequestStatus;
  reviewed_at: string | null;
  rejection_reason: string;
  disbursement: string | null;
  created_at: string;
  updated_at: string;
}
