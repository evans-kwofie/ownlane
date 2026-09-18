type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/** Placeholder for a section with nothing in it yet. Quiet, never apologetic. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <p className="text-[15px] font-medium tracking-[-0.01em]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
