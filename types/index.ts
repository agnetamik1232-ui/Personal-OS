/* ═══════════════════════════════════════════════════════════
   Personal OS — Shared type definitions
   ═══════════════════════════════════════════════════════════ */

// ── Common ─────────────────────────────────────────────────
export type ID = string;
export type ISODateString = string;
export type Trend = "up" | "down" | "neutral";
export type Status = "ok" | "warn" | "danger" | "idle";
export type Priority = "low" | "medium" | "high" | "urgent";

// ── Task management ────────────────────────────────────────
export interface Task {
  id: ID;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: Priority;
  dueDate?: ISODateString;
  tags: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  projectId?: ID;
  sourceRef?: CaptureRef;
}

export interface Project {
  id: ID;
  name: string;
  color: string;
  taskCount: number;
  completedCount: number;
}

// ── Habits & health ────────────────────────────────────────
export interface Habit {
  id: ID;
  name: string;
  icon?: string;
  targetCount: number;
  unit?: string;
  streak: number;
  completedToday: boolean;
  completions: HabitCompletion[];
}

export interface HabitCompletion {
  date: ISODateString;
  count: number;
  note?: string;
}

export interface HealthMetric {
  id: ID;
  name: string;
  value: number;
  unit: string;
  recordedAt: ISODateString;
  trend: Trend;
}

// ── Finance ────────────────────────────────────────────────
export interface Transaction {
  id: ID;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: ISODateString;
  type: "income" | "expense" | "transfer";
  tags: string[];
}

export interface Account {
  id: ID;
  name: string;
  balance: number;
  currency: string;
  type: "checking" | "savings" | "investment" | "crypto" | "pension";
  institution?: string;
}

export interface NetWorthSnapshot {
  date: ISODateString;
  total: number;
  byAccount: Record<ID, number>;
}

// ── Workflows / Production ─────────────────────────────────
export interface WorkflowRun {
  id: ID;
  name: string;
  status: Status;
  startedAt: ISODateString;
  finishedAt?: ISODateString;
  logs?: string[];
  metadata?: Record<string, unknown>;
}

// ── Capture / Telegram ─────────────────────────────────────
export interface CaptureRef {
  source: "telegram" | "email" | "web" | "manual";
  externalId?: string;
}

export interface CaptureItem {
  id: ID;
  content: string;
  source: CaptureRef["source"];
  processed: boolean;
  createdAt: ISODateString;
  linkedTaskId?: ID;
  tags: string[];
}

// ── Analytics ──────────────────────────────────────────────
export interface TimeSeriesPoint {
  date: ISODateString;
  value: number;
  label?: string;
}

export interface KpiMetric {
  id: ID;
  label: string;
  value: number | string;
  previousValue?: number | string;
  unit?: string;
  trend: Trend;
  delta?: string;
}

// ── AI / Memory ────────────────────────────────────────────
export interface MemoryEntry {
  id: ID;
  content: string;
  tags: string[];
  embedding?: number[];
  createdAt: ISODateString;
  source?: string;
  relevanceScore?: number;
}

export interface AIContext {
  sessionId: ID;
  memories: MemoryEntry[];
  activeTasks: Task[];
  recentCaptures: CaptureItem[];
}
