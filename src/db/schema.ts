import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  doublePrecision,
  customType,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * PostGIS geography(Point,4326) custom column type.
 * Stored alongside plain latitude/longitude columns so the app can read
 * coordinates without needing PostGIS functions, while `geom` powers the
 * fast ST_DWithin nearby-search queries.
 */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const roleEnum = ["citizen", "pharmacy_owner", "pharmacy_staff", "admin", "supplier"] as const;
export type UserRole = (typeof roleEnum)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: roleEnum }).notNull().default("citizen"),
  city: text("city"),
  pharmacyId: uuid("pharmacy_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  city: text("city").notNull(),
  address: text("address"),
  phone: text("phone"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  geom: geographyPoint("geom").notNull(),
  apiKey: text("api_key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drugs = pgTable("drugs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  manufacturer: text("manufacturer"),
  category: text("category"),
  unit: text("unit").notNull().default("علبة"),
  barcode: text("barcode").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pharmacyId: uuid("pharmacy_id")
      .notNull()
      .references(() => pharmacies.id, { onDelete: "cascade" }),
    drugId: uuid("drug_id")
      .notNull()
      .references(() => drugs.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
    retailPrice: numeric("retail_price", { precision: 12, scale: 2 }).notNull().default("0"),
    expiryDate: date("expiry_date"),
    batchNumber: text("batch_number").notNull().default("GENERAL"),
    minStockLevel: integer("min_stock_level").notNull().default(10),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pharmacyDrugBatchIdx: uniqueIndex("inventory_pharmacy_drug_batch_idx").on(
      table.pharmacyId,
      table.drugId,
      table.batchNumber,
    ),
  }),
);

export const movementTypeEnum = [
  "purchase",
  "sale",
  "waste",
  "adjustment",
  "return",
  "transfer",
] as const;
export type MovementType = (typeof movementTypeEnum)[number];

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacies.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id")
    .notNull()
    .references(() => drugs.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull().default("GENERAL"),
  movementType: text("movement_type", { enum: movementTypeEnum }).notNull(),
  quantityChange: integer("quantity_change").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
  referenceType: text("reference_type"),
  referenceId: uuid("reference_id"),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacies.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  invoiceDate: date("invoice_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditActionEnum = [
  "pharmacy.toggle_active",
  "pharmacy.update",
  "user.change_role",
  "drug.create",
  "drug.update",
  "drug.delete",
  "api_key.regenerate",
  "api_key.revoke",
] as const;
export type AuditAction = (typeof auditActionEnum)[number];

export const requestStatusEnum = ["pending", "accepted", "rejected", "fulfilled"] as const;
export type RequestStatus = (typeof requestStatusEnum)[number];

export const pharmacyRequests = pgTable("pharmacy_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  citizenId: uuid("citizen_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacies.id, { onDelete: "cascade" }),
  drugName: text("drug_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  status: text("status", { enum: requestStatusEnum }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id")
    .notNull()
    .references(() => drugs.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull().default("0"),
});

// ─── Phase 2: Supplier Marketplace ──────────────────────────────

export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    drugId: uuid("drug_id")
      .notNull()
      .references(() => drugs.id, { onDelete: "cascade" }),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    minQuantity: integer("min_quantity").notNull().default(1),
    available: boolean("available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    supplierDrugIdx: uniqueIndex("supplier_products_supplier_drug_idx").on(
      table.supplierId,
      table.drugId,
    ),
  }),
);

export const orderStatusEnum = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
] as const;
export type OrderStatus = (typeof orderStatusEnum)[number];

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacies.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: orderStatusEnum }).notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  drugId: uuid("drug_id")
    .notNull()
    .references(() => drugs.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
});

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderUserIdx: uniqueIndex("ratings_order_user_idx").on(table.orderId, table.fromUserId),
  }),
);

export const pharmacyReviews = pgTable("pharmacy_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  citizenId: uuid("citizen_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacies.id, { onDelete: "cascade" }),
  requestId: uuid("request_id")
    .notNull()
    .references(() => pharmacyRequests.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  referenceId: uuid("reference_id"),
  referenceType: text("reference_type"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
