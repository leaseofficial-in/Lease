// ─── Core domain types for Flatvio ───────────────────────────────────────────

export type UserRole = 'landlord' | 'tenant';

export type RentalStatus =
  | 'active'
  | 'pending_tenant'
  | 'pending_proof'
  | 'ended';

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export type ProofStatus = 'pending' | 'approved' | 'rejected' | 'dispute';

export type RepairStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  role: UserRole | null;
  email: string | null;
  pan_number: string | null;
  aadhaar_last4: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Property ─────────────────────────────────────────────────────────────────

export interface Property {
  id: string;
  landlord_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  property_type: 'apartment' | 'house' | 'pg' | 'commercial';
  created_at: string;
}

// ─── Rental ───────────────────────────────────────────────────────────────────

export interface Rental {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string | null;
  status: RentalStatus;
  monthly_rent: number;
  security_deposit: number;
  rent_due_day: number;
  start_date: string;
  end_date: string | null;
  invite_token: string;
  invite_expires_at: string;
  agreement_url: string | null;
  agreement_signed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  property?: Property;
  tenant?: Profile;
  landlord?: Profile;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export interface RentPayment {
  id: string;
  rental_id: string;
  tenant_id: string;
  amount: number;
  month: string; // ISO date — first day of the rent month
  status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
  late_fee: number;
  receipt_url: string | null;
  created_at: string;
}

// ─── Deposit ──────────────────────────────────────────────────────────────────

export interface DepositTransaction {
  id: string;
  rental_id: string;
  type: 'received' | 'deduction' | 'refund';
  amount: number;
  note: string;
  created_by: string;
  created_at: string;
}

// ─── Move-in / Move-out Proof ─────────────────────────────────────────────────

export type ProofType = 'move_in' | 'move_out';

export interface Proof {
  id: string;
  rental_id: string;
  type: ProofType;
  status: ProofStatus;
  submitted_by: string;
  reviewed_by: string | null;
  dispute_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  photos?: ProofPhoto[];
}

export interface ProofPhoto {
  id: string;
  proof_id: string;
  room_label: string;
  storage_path: string;
  public_url: string;
  annotation: string | null;
  uploaded_by: string;
  created_at: string;
}

// ─── Repair Requests ──────────────────────────────────────────────────────────

export interface RepairRequest {
  id: string;
  rental_id: string;
  raised_by: string;
  title: string;
  description: string;
  priority: RepairPriority;
  status: RepairStatus;
  photos: string[]; // storage paths
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  raised_by_profile?: Profile;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'rent_due' | 'payment_received' | 'proof_submitted' | 'repair_update' | 'general';
  read: boolean;
  data: Record<string, string> | null;
  created_at: string;
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface CreateRentalForm {
  propertyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  propertyType: Property['property_type'];
  monthlyRent: string;
  securityDeposit: string;
  rentDueDay: string;
  startDate: string;
  tenantName: string;
  tenantPhone: string;
}

export interface RepairRequestForm {
  title: string;
  description: string;
  priority: RepairPriority;
}

export interface ProfileForm {
  full_name: string;
  email: string;
  pan_number: string;
}

// ─── Navigation param types ───────────────────────────────────────────────────

export interface RentalRouteParams {
  id: string;
}

export interface ProofRouteParams {
  rentalId: string;
}

export interface JoinRouteParams {
  token: string;
}
