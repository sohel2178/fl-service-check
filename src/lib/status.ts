import type { Outcome, Role, Status } from './types';

export type Tone = 'office' | 'field' | 'review' | 'done' | 'cancelled';

/** Five tones, by phase of the job, instead of a colour per status. */
export const TONE_CLASS: Record<Tone, { chip: string; dot: string; bar: string }> = {
  office: { chip: 'bg-secondary text-foreground', dot: 'bg-foreground/55', bar: 'bg-foreground/60' },
  field: { chip: 'bg-fix/10 text-fix', dot: 'bg-fix', bar: 'bg-fix' },
  review: { chip: 'bg-primary/20 text-[hsl(30_80%_28%)]', dot: 'bg-primary', bar: 'bg-primary' },
  done: { chip: 'bg-ok/10 text-ok', dot: 'bg-ok', bar: 'bg-ok' },
  cancelled: { chip: 'bg-destructive/10 text-destructive', dot: 'bg-destructive', bar: 'bg-destructive' },
};

export const STATUS_META: Record<Status, { label: string; tone: Tone; upcoming: string }> = {
  PENDING_MANAGER: { label: 'Waiting for manager', tone: 'office', upcoming: 'Complaint logged' },
  CONTACTING_CUSTOMER: { label: 'Talking to customer', tone: 'office', upcoming: 'Manager calls the customer' },
  CUSTOMER_AGREED: { label: 'Needs a technician', tone: 'office', upcoming: 'Customer agrees to the visit' },
  ASSIGNED: { label: 'Assigned', tone: 'field', upcoming: 'Technician assigned' },
  ACCEPTED: { label: 'Accepted', tone: 'field', upcoming: 'Technician accepts' },
  ON_THE_WAY: { label: 'On the way', tone: 'field', upcoming: 'Technician heads out' },
  IN_PROGRESS: { label: 'Checking device', tone: 'field', upcoming: 'Service check starts' },
  COMPLETED: { label: 'Ready to verify', tone: 'review', upcoming: 'Technician submits result' },
  CLOSED: { label: 'Closed', tone: 'done', upcoming: 'Manager verifies and closes' },
  CANCELLED: { label: 'Cancelled', tone: 'cancelled', upcoming: 'Cancelled' },
};

/** The normal route a ticket travels. */
export const ROUTE: Status[] = [
  'PENDING_MANAGER',
  'CONTACTING_CUSTOMER',
  'CUSTOMER_AGREED',
  'ASSIGNED',
  'ACCEPTED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
];

export const routeProgress = (status: Status) => (status === 'CANCELLED' ? -1 : ROUTE.indexOf(status));

/** Plain-language "who has the ball" for a ticket. */
export function waitingOn(t: { status: Status; manager: { name: string } | null; technician: { name: string } | null }) {
  const mgr = t.manager?.name || 'a Service Check Manager';
  const tech = t.technician?.name || 'the technician';
  switch (t.status) {
    case 'PENDING_MANAGER': return `Waiting for ${mgr} to pick this up.`;
    case 'CONTACTING_CUSTOMER': return `${mgr} is confirming location, date and charge with the customer.`;
    case 'CUSTOMER_AGREED': return `Customer agreed. ${mgr} needs to assign a technician.`;
    case 'ASSIGNED': return `Waiting for ${tech} to accept the job.`;
    case 'ACCEPTED': return `${tech} has accepted and will head out on the scheduled date.`;
    case 'ON_THE_WAY': return `${tech} is on the way to the customer.`;
    case 'IN_PROGRESS': return `${tech} is checking the device now.`;
    case 'COMPLETED': return `Result submitted. ${mgr} needs to verify it.`;
    case 'CLOSED': return 'This service check is closed.';
    case 'CANCELLED': return 'This ticket was cancelled.';
  }
}

/** What to do, addressed to the person whose move it is. */
export const YOUR_MOVE_TEXT: Partial<Record<Status, string>> = {
  PENDING_MANAGER: 'Pick this up, then call the customer to confirm location, date and charge.',
  CONTACTING_CUSTOMER: 'Record what the customer agreed to, or mark it declined with a reason.',
  CUSTOMER_AGREED: 'Assign a technician. People who cover this zone are suggested first.',
  ASSIGNED: 'Accept the job if you can make the visit. Otherwise reject it with a reason.',
  ACCEPTED: 'Mark yourself on the way when you leave for the customer.',
  ON_THE_WAY: 'Start the service check when you reach the vehicle.',
  IN_PROGRESS: 'Submit the result and the charge you collected when you finish.',
  COMPLETED: 'Check the technician’s result, then verify and close, or send it back.',
};

/** Statuses where each role is the one expected to act. */
export const YOUR_MOVE: Record<Role, Status[]> = {
  call_center: [],
  manager: ['PENDING_MANAGER', 'CONTACTING_CUSTOMER', 'CUSTOMER_AGREED', 'COMPLETED'],
  technician: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'],
  admin: ['PENDING_MANAGER', 'CONTACTING_CUSTOMER', 'CUSTOMER_AGREED', 'COMPLETED'],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  call_center: 'Call Center',
  manager: 'Service Check Manager',
  technician: 'Technician',
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  FIXED: 'Fixed',
  DEVICE_REPLACED: 'Device replaced',
  NOT_FIXED: 'Not fixed',
  NEEDS_FOLLOWUP: 'Needs follow-up',
};

/** Status groups used as list tabs, per role. */
export const TABS: Record<Role, { key: string; label: string; statuses: Status[] }[]> = {
  call_center: [
    { key: 'open', label: 'Open', statuses: ['PENDING_MANAGER', 'CONTACTING_CUSTOMER', 'CUSTOMER_AGREED', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'] },
    { key: 'closed', label: 'Closed', statuses: ['CLOSED'] },
    { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
    { key: 'all', label: 'All', statuses: [] },
  ],
  manager: [
    { key: 'new', label: 'New', statuses: ['PENDING_MANAGER'] },
    { key: 'customer', label: 'With customer', statuses: ['CONTACTING_CUSTOMER', 'CUSTOMER_AGREED'] },
    { key: 'field', label: 'In field', statuses: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'] },
    { key: 'verify', label: 'To verify', statuses: ['COMPLETED'] },
    { key: 'done', label: 'Done', statuses: ['CLOSED', 'CANCELLED'] },
    { key: 'all', label: 'All', statuses: [] },
  ],
  technician: [
    { key: 'new', label: 'New jobs', statuses: ['ASSIGNED'] },
    { key: 'active', label: 'Active', statuses: ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'] },
    { key: 'done', label: 'Done', statuses: ['COMPLETED', 'CLOSED'] },
    { key: 'all', label: 'All', statuses: [] },
  ],
  admin: [
    { key: 'all', label: 'All', statuses: [] },
    { key: 'new', label: 'New', statuses: ['PENDING_MANAGER'] },
    { key: 'customer', label: 'With customer', statuses: ['CONTACTING_CUSTOMER', 'CUSTOMER_AGREED'] },
    { key: 'field', label: 'In field', statuses: ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'] },
    { key: 'verify', label: 'To verify', statuses: ['COMPLETED'] },
    { key: 'done', label: 'Closed', statuses: ['CLOSED'] },
    { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
  ],
};
