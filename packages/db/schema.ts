import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const scanStatusEnum = pgEnum("scan_status", ["PASSED", "BLOCKED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull()
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: scanStatusEnum("status").notNull().default("PASSED"),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0)
});

export const vulnerabilities = pgTable("vulnerabilities", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(),
  tool: text("tool").notNull(),
  description: text("description").notNull()
});

export const scansRelations = relations(scans, ({ many }) => ({
  vulnerabilities: many(vulnerabilities)
}));

export const vulnerabilitiesRelations = relations(vulnerabilities, ({ one }) => ({
  scan: one(scans, {
    fields: [vulnerabilities.scanId],
    references: [scans.id]
  })
}));
