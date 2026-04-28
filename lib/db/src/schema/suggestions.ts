import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { storesTable } from "./stores";

export const suggestionStatusValues = ["pending", "confirmed"] as const;
export type SuggestionStatus = (typeof suggestionStatusValues)[number];

export const storeSuggestionsTable = pgTable("store_suggestions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .notNull()
    .references(() => storesTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StoreSuggestion = typeof storeSuggestionsTable.$inferSelect;
export type InsertStoreSuggestion = typeof storeSuggestionsTable.$inferInsert;
