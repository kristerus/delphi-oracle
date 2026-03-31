import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  uuid,
  real,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ─── Better Auth required tables ──────────────────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

/* ─── Application tables ────────────────────────────────────────────────────── */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  githubUsername: text("github_username"),
  twitterUsername: text("twitter_username"),
  education: jsonb("education").$type<EducationEntry[]>().default([]),
  experience: jsonb("experience").$type<ExperienceEntry[]>().default([]),
  skills: jsonb("skills").$type<string[]>().default([]),
  preferences: jsonb("preferences").$type<ProfilePreferences>(),
  rawScrapedData: jsonb("raw_scraped_data"),
  scrapedAt: timestamp("scraped_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const simulations = pgTable("simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  rootNodeId: uuid("root_node_id"),
  categories: jsonb("categories").notNull().default(["career"]),
  status: text("status", {
    enum: ["draft", "generating", "complete", "error"],
  })
    .notNull()
    .default("draft"),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const futureNodes = pgTable("future_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  simulationId: uuid("simulation_id")
    .notNull()
    .references(() => simulations.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  probability: real("probability").notNull().default(0),
  timeframe: text("timeframe"),
  depth: integer("depth").notNull().default(0),
  certainty: real("certainty").notNull().default(1),
  granularity: text("granularity", { enum: ["month", "year", "decade"] }),
  timeframeStart: text("timeframe_start"),
  timeframeEnd: text("timeframe_end"),
  details: jsonb("details").$type<NodeDetails>(),
  metadata: jsonb("metadata").$type<NodeMetadata>(),
  positionX: real("position_x"),
  positionY: real("position_y"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider", {
    enum: ["claude", "openai", "custom"],
  }).notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  label: text("label"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ─── Relations ─────────────────────────────────────────────────────────────── */

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profiles, { fields: [user.id], references: [profiles.userId] }),
  simulations: many(simulations),
  apiKeys: many(apiKeys),
  sessions: many(session),
  accounts: many(account),
}));

export const simulationRelations = relations(simulations, ({ one, many }) => ({
  user: one(user, { fields: [simulations.userId], references: [user.id] }),
  nodes: many(futureNodes),
}));

export const futureNodeRelations = relations(futureNodes, ({ one, many }) => ({
  simulation: one(simulations, { fields: [futureNodes.simulationId], references: [simulations.id] }),
  parent: one(futureNodes, { fields: [futureNodes.parentId], references: [futureNodes.id] }),
  children: many(futureNodes),
}));

/* ─── TypeScript types ──────────────────────────────────────────────────────── */

export type User = typeof user.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Simulation = typeof simulations.$inferSelect;
export type FutureNode = typeof futureNodes.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;

export interface EducationEntry {
  institution: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ProfilePreferences {
  riskTolerance: "low" | "medium" | "high";
  timeHorizon: "1y" | "3y" | "5y" | "10y";
  focusAreas: string[];
  notifications?: Record<string, boolean>;
}

export interface NodeDetails {
  pros?: string[];
  cons?: string[];
  keyEvents?: string[];
  skillsNeeded?: string[];
  financialImpact?: string;
  emotionalImpact?: string;
}

export interface NodeMetadata {
  model?: string;
  generatedAt?: string;
  parentDecision?: string;
  promptTokens?: number;
  completionTokens?: number;
}
