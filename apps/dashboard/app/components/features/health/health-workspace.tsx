import { useState } from 'react';
import { ArrowUpRightIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Link, useFetcher } from 'react-router';

import { Button } from '@ownlane/ui/components/button';
import { cn } from '@ownlane/ui/lib/utils';

import { PageHeader } from '../../page-header';
import { useActionFeedback } from '../../../lib/action-feedback';
import { useWorkspacePath } from '../../../lib/workspaces';
import {
  HEALTH_AREAS,
  HEALTH_AREA_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type Finding,
  type HealthArea,
  type HealthReport,
  type Severity,
} from '../../../features/health/schema';

/**
 * Severity colours are fixed state, not a series palette, and every one is
 * paired with its label so colour never carries the meaning alone.
 */
const SEVERITY_COLOR: Record<Severity | 'passing', string> = {
  critical: 'var(--chart-down)',
  warning: 'var(--chart-warn)',
  idea: 'var(--chart-2)',
  passing: 'var(--chart-up)',
};

export function HealthWorkspace({ report }: { report: HealthReport }) {
  const [area, setArea] = useState<HealthArea | 'all'>('all');
  const workspacePath = useWorkspacePath();
  const recheck = useFetcher<{ saved?: string; error?: string }>();
  useActionFeedback(recheck.data);

  const open = report.findings.filter((finding) => !finding.pending);
  const visible = report.findings.filter((finding) => area === 'all' || finding.area === area);
  const total = report.counts.passing + open.length;

  return (
    <>
      <PageHeader
        title="Identity health"
        description="Where your presence has drifted, gone stale or broken."
        action={
          <recheck.Form method="post">
            <Button disabled={recheck.state !== 'idle'} type="submit" variant="outline">
              {recheck.state === 'idle' ? 'Re-check now' : 'Checking…'}
            </Button>
          </recheck.Form>
        }
      />

      <section className="grid gap-5 rounded-xl border border-border/70 bg-card p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {report.score}
            <span className="text-[15px] font-normal tracking-normal text-muted-foreground">
              {' '}
              / 100
            </span>
          </p>
          <p className="mt-2 max-w-[46ch] text-[13.5px] text-muted-foreground">
            {report.counts.critical
              ? `${report.counts.critical} ${report.counts.critical === 1 ? 'thing is' : 'things are'} broken right now. Fix those first — the rest can wait.`
              : open.length
                ? 'Nothing is broken. What is left is drift and polish.'
                : 'Everything checks out.'}
          </p>

          {/* One ratio against a limit, so a meter rather than a chart. */}
          <div className="mt-3.5 flex h-2 overflow-hidden rounded-full bg-muted">
            {(['passing', 'idea', 'warning', 'critical'] as const).map((key) =>
              report.counts[key] ? (
                <i
                  key={key}
                  style={{
                    background: SEVERITY_COLOR[key],
                    width: `${(report.counts[key] / total) * 100}%`,
                  }}
                />
              ) : null,
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-3.5 text-xs text-muted-foreground">
            <Key color={SEVERITY_COLOR.critical} label="Broken" value={report.counts.critical} />
            <Key color={SEVERITY_COLOR.warning} label="Drifting" value={report.counts.warning} />
            <Key color={SEVERITY_COLOR.idea} label="Could be better" value={report.counts.idea} />
            <Key color={SEVERITY_COLOR.passing} label="Good" value={report.counts.passing} />
          </div>
        </div>

        <div>
          {HEALTH_AREAS.map((key) => {
            const items = open.filter((finding) => finding.area === key);
            const worst = items.some((f) => f.severity === 'critical')
              ? SEVERITY_COLOR.critical
              : items.some((f) => f.severity === 'warning')
                ? SEVERITY_COLOR.warning
                : items.length
                  ? SEVERITY_COLOR.idea
                  : SEVERITY_COLOR.passing;
            return (
              <div className="flex items-center gap-2.5 py-[7px] text-[13.5px]" key={key}>
                <span className="min-w-0 flex-1 truncate">{HEALTH_AREA_LABELS[key]}</span>
                <span className="h-[5px] w-21 shrink-0 overflow-hidden rounded-full bg-muted">
                  <i
                    className="block h-full rounded-full"
                    style={{
                      background: worst,
                      width: `${items.length ? Math.max(12, 100 - items.length * 26) : 100}%`,
                    }}
                  />
                </span>
                <span className="w-7 shrink-0 text-right tabular-nums text-muted-foreground">
                  {items.length || '✓'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5">
        <AreaTab
          active={area === 'all'}
          count={open.length}
          label="All"
          onSelect={() => setArea('all')}
        />
        {HEALTH_AREAS.map((key) => (
          <AreaTab
            active={area === key}
            count={open.filter((finding) => finding.area === key).length}
            key={key}
            label={HEALTH_AREA_LABELS[key]}
            onSelect={() => setArea(key)}
          />
        ))}
      </div>

      <div className="mt-3.5">
        {visible.length ? (
          SEVERITIES.map((severity) => {
            const group = visible.filter((finding) => finding.severity === severity);
            if (!group.length) return null;
            return (
              // Spacing sits on the wrapper, not the label: the label is always the
              // first child of its own group, so `first:` on it applied everywhere
              // and removed the gap between every group.
              <div className="mt-4 first:mt-0" key={severity}>
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {SEVERITY_LABELS[severity]} · {group.length}
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border/70 bg-card">
                  {group.map((finding) => (
                    <FindingRow finding={finding} key={finding.id} path={workspacePath} />
                  ))}
                </ul>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
            <p className="font-medium">Nothing to fix here</p>
            <p className="mt-1 text-sm text-muted-foreground">Every check in this area passes.</p>
          </div>
        )}
      </div>

      {report.passing.length ? (
        <details className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-[13.5px] font-medium [&::-webkit-details-marker]:hidden">
            <i className="size-2 rounded-full" style={{ background: SEVERITY_COLOR.passing }} />
            {report.passing.length} checks passing
            <ChevronDownIcon className="ml-auto size-4 text-muted-foreground" />
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {report.passing.map((check) => (
              <li
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] text-muted-foreground"
                key={check.id}
              >
                <CheckIcon
                  className="size-3.5 shrink-0"
                  style={{ color: SEVERITY_COLOR.passing }}
                />
                {check.label}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

function FindingRow({ finding, path }: { finding: Finding; path: (to: string) => string }) {
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <i
        aria-hidden="true"
        className="mt-[7px] size-2 shrink-0 rounded-full"
        style={{ background: SEVERITY_COLOR[finding.severity] }}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {finding.title}
          {finding.pending ? (
            <span className="rounded-full border border-dashed border-border px-2 py-px text-[11px] font-normal text-muted-foreground">
              not running yet
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 max-w-[78ch] text-[13px] text-muted-foreground">{finding.why}</p>
        {/* The rows this came from. A check with no evidence is an opinion. */}
        <p className="mt-2 inline-block max-w-full overflow-x-auto whitespace-nowrap rounded-md bg-muted px-2.5 py-1.5 font-mono text-[11.5px] text-muted-foreground">
          {finding.evidence}
        </p>
        {finding.links?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {finding.links.map((link) => (
              <a
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                href={link.href}
                key={link.href}
                rel="noreferrer noopener"
                target="_blank"
              >
                {link.label}
                <ArrowUpRightIcon aria-hidden="true" className="size-3" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
      {finding.fix ? (
        <div className="flex-none self-center">
          <Button asChild size="sm" variant="outline">
            <Link to={path(finding.fix.to)}>{finding.fix.label}</Link>
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function AreaTab({
  active,
  count,
  label,
  onSelect,
}: {
  active: boolean;
  count: number;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground',
        active && 'bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
      )}
      onClick={onSelect}
      type="button"
    >
      {label}
      <span className="text-[11px] tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Key({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label} <b className="font-semibold tabular-nums">{value}</b>
    </span>
  );
}
