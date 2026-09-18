type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Sits beside the title, e.g. whether this profile is public. */
  badge?: React.ReactNode;
  /** The page's own controls, aligned right of the title. */
  action?: React.ReactNode;
};

/**
 * The top of a page: its title, state and controls. It belongs to the page and
 * scrolls with it — the app's own chrome is the strip above.
 */
export function PageHeader({ title, description, badge, action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 pb-7">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-medium leading-tight tracking-[-0.025em]">{title}</h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
