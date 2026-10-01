import { DealStage } from "@prisma/client";

/** Human labels. Enum values are kept as-is in the DB to protect existing data. */
export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  DISCOVERY: "New",
  QUALIFICATION: "Qualification",
  NEEDS_ANALYSIS: "Needs Analysis",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export const OPEN_DEAL_STAGES: DealStage[] = [
  "DISCOVERY",
  "QUALIFICATION",
  "NEEDS_ANALYSIS",
  "PROPOSAL",
  "NEGOTIATION",
];
