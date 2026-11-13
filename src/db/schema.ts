import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const PLATFORMS = ["facebook", "instagram", "youtube", "tiktok", "x", "lemon8", "line", "web"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const FORMATS = ["reel", "video", "image", "carousel", "article"] as const;
export type Format = (typeof FORMATS)[number];

export const CONTENT_STATUSES = ["idea", "draft", "review", "changes", "approved", "scheduled", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const ROLES = ["admin", "manager", "creator", "analyst"] as const;
export type Role = (typeof ROLES)[number];

export const PUBLISH_STATES = ["pending", "posted", "manual_todo", "manual_done", "failed"] as const;
export type PublishState = (typeof PUBLISH_STATES)[number];

export type ChannelStatus = "not_connected" | "connected" | "coming_soon";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const projects = pgTable("projects", {
  id: id(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3E4FE0"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<Role>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const invites = pgTable("invites", {
  token: text("token").primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").$type<Role>().notNull(),
  email: text("email"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
});

export const workTypes = pgTable("work_types", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  manualOnly: boolean("manual_only").notNull().default(false),
});

export const pillars = pgTable("pillars", {
  id: id(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const channels = pgTable(
  "channels",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    platform: text("platform").$type<Platform>().notNull(),
    status: text("status").$type<ChannelStatus>().notNull(),
    accountName: text("account_name"),
  },
  (t) => [unique("channels_project_platform").on(t.projectId, t.platform)],
);

export const contents = pgTable(
  "contents",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    workTypeId: uuid("work_type_id").references(() => workTypes.id, { onDelete: "set null" }),
    format: text("format").$type<Format>().notNull(),
    pillarId: uuid("pillar_id").references(() => pillars.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    status: text("status").$type<ContentStatus>().notNull(),
    caption: text("caption").notNull().default(""),
    assetLink: text("asset_link").notNull().default(""),
    version: integer("version").notNull().default(1),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contents_project_scheduled_idx").on(t.projectId, t.scheduledAt), index("contents_status_idx").on(t.status)],
);

export const contentChannels = pgTable(
  "content_channels",
  {
    id: id(),
    contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
    platform: text("platform").$type<Platform>().notNull(),
    captionOverride: text("caption_override"),
    publishState: text("publish_state").$type<PublishState>().notNull().default("pending"),
    postUrl: text("post_url"),
    reason: text("reason"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedBy: uuid("posted_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [unique("content_channels_content_platform").on(t.contentId, t.platform)],
);

export const media = pgTable("media", {
  id: id(),
  contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"image" | "video">().notNull(),
  storageKey: text("storage_key").notNull(),
  thumbKey: text("thumb_key"),
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const comments = pgTable("comments", {
  id: id(),
  contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }),
  pinX: real("pin_x"),
  pinY: real("pin_y"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.contentId] })],
);

export const contentVersions = pgTable("content_versions", {
  id: id(),
  contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: createdAt(),
});

export const metrics = pgTable(
  "metrics",
  {
    id: id(),
    contentChannelId: uuid("content_channel_id").notNull().references(() => contentChannels.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views"),
    likes: integer("likes"),
    comments: integer("comments"),
    shares: integer("shares"),
    clicks: integer("clicks"),
    source: text("source").$type<"api" | "manual">().notNull(),
    enteredBy: uuid("entered_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [unique("metrics_channel_day").on(t.contentChannelId, t.day)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    contentId: uuid("content_id").references(() => contents.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

export const notificationPrefs = pgTable("notification_prefs", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  email: boolean("email").notNull().default(true),
  inApp: boolean("in_app").notNull().default(true),
});

export const activity = pgTable(
  "activity",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    text: text("text").notNull(),
    contentId: uuid("content_id").references(() => contents.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [index("activity_project_idx").on(t.projectId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Content = typeof contents.$inferSelect;
export type ContentChannel = typeof contentChannels.$inferSelect;
export type Media = typeof media.$inferSelect;
export type WorkType = typeof workTypes.$inferSelect;
export type Pillar = typeof pillars.$inferSelect;
export type Channel = typeof channels.$inferSelect;
