export const HEALTH_AREAS = [
  'profile',
  'consistency',
  'reach',
  'links',
  'connections',
  'content',
] as const;

export type HealthArea = (typeof HEALTH_AREAS)[number];

export const HEALTH_AREA_LABELS: Record<HealthArea, string> = {
  profile: 'Profile',
  consistency: 'Consistency',
  reach: 'Reachability',
  links: 'Links',
  connections: 'Connections',
  content: 'Content',
};

/**
 * Severity is consequence, not effort.
 *
 * `critical` is something a visitor hits today. `warning` is wrong somewhere
 * nobody is looking. `idea` is advice, and is deliberately quiet — a page that
 * shouts about optional fields trains people to stop reading it.
 */
export const SEVERITIES = ['critical', 'warning', 'idea'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Broken',
  warning: 'Drifting',
  idea: 'Could be better',
};

/** How much each open finding costs the score. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 5,
  warning: 2,
  idea: 1,
};

/** What one passing check contributes, so the score is reconstructable. */
export const PASS_WEIGHT = 2;

export type Finding = {
  /** Stable across runs, so a finding can be dismissed or linked to later. */
  id: string;
  severity: Severity;
  area: HealthArea;
  title: string;
  /** What it costs the person. Never a restatement of the title. */
  why: string;
  /** The rows this was computed from. A check with no evidence is an opinion. */
  evidence: string;
  /** Where it gets fixed, in the module that owns it. Workspace-relative. */
  fix?: { label: string; to: string };
  /** Places to go outside Ownlane, e.g. a platform where a handle is free. */
  links?: Array<{ label: string; href: string }>;
  /** The check is designed but its infrastructure is not running yet. */
  pending?: boolean;
};

export type PassingCheck = { id: string; area: HealthArea; label: string };

export type HealthReport = {
  score: number;
  findings: Finding[];
  passing: PassingCheck[];
  counts: Record<Severity | 'passing', number>;
  checkedAt: string;
};
