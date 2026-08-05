import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Users table mapping accounts & profiles
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or username
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: integer('role').notNull().default(2), // Index in INITIAL_ROLES
  dept: text('dept').notNull().default('NICU'),
  status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'pending'
  isAdmin: boolean('is_admin').notNull().default(false),
  passwordHash: text('password_hash'), // Nullable for Google Auth users
  createdAt: timestamp('created_at').defaultNow()
});

// Linen items catalog (original stock information)
export const linenItems = pgTable('linen_items', {
  ma: text('ma').primaryKey(), // DV001, etc.
  ten: text('ten').notNull(),
  nhom: text('nhom').notNull(), // Group name
  kc: integer('kc').notNull().default(0), // Central stock (Tồn kho chính)
  mn: integer('mn').notNull().default(20), // Minimum limit
   hinhAnh: text('hinh_anh'),
  trang: text('trang').default('Trang 1'),
  createdAt: timestamp('created_at').defaultNow(),
  tempClean: integer('temp_clean').notNull().default(0),
  tempDirty: integer('temp_dirty').notNull().default(0),
  tempCompanyDirty: integer('temp_company_dirty').notNull().default(0),
});

// Detailed allocations per department
export const deptAllocations = pgTable('dept_allocations', {
  id: serial('id').primaryKey(),
  itemMa: text('item_ma').notNull().references(() => linenItems.ma, { onDelete: 'cascade' }),
  dept: text('dept').notNull(),
  qty: integer('qty').notNull().default(0)
});

// Ward delivery slips (Step 1-5 tracking sheets)
export const deliverySlips = pgTable('delivery_slips', {
  id: text('id').primaryKey(), // PGN-YYYYMMDDXX
  dept: text('dept').notNull(),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by').notNull(),
  originalSlipId: text('original_slip_id'),
  originalCreatedAt: text('original_created_at'),
  receiver: text('receiver'),
  status: text('status').notNull(), // 'pending' | 'verified_dirty' | 'laundry_received' | 'laundry_returned' | 'completed' | 'confirmed'
  confirmedAt: text('confirmed_at'),
  confirmedBy: text('confirmed_by'),
  laundryDispatchId: text('laundry_dispatch_id'),
  laundryReceivedBy: text('laundry_received_by'),
  laundryReceivedAt: text('laundry_received_at'),
  laundryReturnedBy: text('laundry_returned_by'),
  laundryReturnedAt: text('laundry_returned_at'),
  hospitalCleanBy: text('hospital_clean_by'),
  hospitalCleanAt: text('hospital_clean_at'),
  verifiedDirtyBy: text('verified_dirty_by'),
  verifiedDirtyAt: text('verified_dirty_at'),
  isGuestSlip: boolean('is_guest_slip').notNull().default(false),
  isRewash: boolean('is_rewash').notNull().default(false),
  attachedImage: text('attached_image'),
  guestName: text('guest_name'),
  guestRoom: text('guest_room'),
  items: text('items').notNull() // JSON array of items details
});

// Laundry dispatch bills (Line 2/Line 4 interactions with laundry partner)
export const laundryDispatches = pgTable('laundry_dispatches', {
  id: text('id').primaryKey(), // Bill-Tong-YYYYMMDDXX
  createdAt: text('created_at').notNull(),
  originalDispatchId: text('original_dispatch_id'),
  originalCreatedAt: text('original_created_at'),
  contractor: text('contractor').notNull(),
  driver: text('driver').notNull(),
  plate: text('plate').notNull(),
  status: text('status').notNull(), // 'pending_laundry' | 'washing' | 'returning_clean' | 'completed'
  laundryReceivedAt: text('laundry_received_at'),
  laundryReceivedBy: text('laundry_received_by'),
  cleanReturnedAt: text('clean_returned_at'),
  cleanReturnedBy: text('clean_returned_by'),
  hospitalVerifiedAt: text('hospital_verified_at'),
  hospitalVerifiedBy: text('hospital_verified_by'),
  linkedSlipIds: text('linked_slip_ids').notNull(), // JSON array of linked slip IDs
  isGuestBill: boolean('is_guest_bill').notNull().default(false),
  attachedImage: text('attached_image'),
  guestName: text('guest_name'),
  guestRoom: text('guest_room'),
  dept: text('dept'),
  items: text('items').notNull(), // JSON array of handover items
  lossNote: text('loss_note')
});

// Transaction history log (Central stock transactions: import, transfer, audit, etc.)
export const history = pgTable('history', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc'
  date: text('date').notNull(),
  user: text('user').notNull(),
  note: text('note').notNull(),
  fromDept: text('from_dept').notNull(),
  toDept: text('to_dept').notNull(),
  items: text('items').notNull(), // JSON array of items moved
  status: text('status').notNull(), // 'pending_dept' | 'confirmed' | 'rejected'
  rejectReason: text('reject_reason'),
  confirmedBy: text('confirmed_by'),
  confirmedAt: text('confirmed_at'),
  movementApplied: boolean('movement_applied').notNull().default(false),
  createdAt: text('created_at'),
  creatorDept: text('creator_dept')
});
