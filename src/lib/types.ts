export type Role = 'admin' | 'call_center' | 'manager' | 'technician';

export type Status =
  | 'PENDING_MANAGER'
  | 'CONTACTING_CUSTOMER'
  | 'CUSTOMER_AGREED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type Action =
  | 'pick_up'
  | 'customer_agreed'
  | 'customer_declined'
  | 'assign_technician'
  | 'accept'
  | 'reject'
  | 'on_the_way'
  | 'start_work'
  | 'complete'
  | 'verify_close'
  | 'reopen'
  | 'cancel';

export type Outcome = 'FIXED' | 'DEVICE_REPLACED' | 'NOT_FIXED' | 'NEEDS_FOLLOWUP';

export interface Zone {
  _id: string;
  name: string;
  district?: string;
  isActive?: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  zones: Zone[];
  isActive: boolean;
}

export interface UserRef {
  _id: string;
  name: string;
  role: Role;
  phone?: string;
}

export interface HistoryEntry {
  action: string;
  from: Status | null;
  to: Status;
  by: UserRef;
  role: Role;
  note: string;
  at: string;
}

export interface Ticket {
  _id: string;
  ticketNo: string;
  customer: { name: string; phone: string; altPhone?: string };
  vehicleRegNo: string;
  imei: string;
  complaint: string;
  serviceCharge: number;
  finalCharge?: number;
  location?: { address?: string; zone?: Zone | null };
  scheduledDate?: string;
  status: Status;
  createdBy: UserRef;
  manager: UserRef | null;
  technician: UserRef | null;
  result?: { outcome: Outcome | null; notes?: string; chargeCollected?: number; completedAt?: string };
  history?: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AllowedAction {
  action: Action;
  label: string;
  to: Status;
}

export interface TechnicianOption extends Omit<User, 'email' | 'role' | 'isActive'> {
  openJobs: number;
  inZone: boolean;
}
