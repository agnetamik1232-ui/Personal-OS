/**
 * Static operator profile — edit this file to update the dashboard header card.
 * All values are plain strings; nothing is persisted to the database.
 */

export interface OperatorConfig {
  name:         string;
  role:         string;
  location:     string;
  timezone:     string;  // IANA, e.g. "Europe/Vilnius"
  currentFocus: string;  // One-line statement of current quarter / sprint goal
  tags:         string[];
}

export const OPERATOR: OperatorConfig = {
  name:         "Saad",
  role:         "Founder & Operator",
  location:     "Vilnius, LT",
  timezone:     "Europe/Vilnius",
  currentFocus: "Q2 — close seed round & ship v1",
  tags:         ["building", "fundraising", "focus-mode"],
};
