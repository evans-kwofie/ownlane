type OwnlaneMarkProps = { variant: "folded" | "open"; className?: string };

export function OwnlaneMark({ variant, className }: OwnlaneMarkProps) {
  if (variant === "folded") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 40 40" fill="none">
        <path d="M8 8h17l7 7v17l-8 0L8 16V8Z" fill="currentColor" />
        <path d="M8 24 24 8h8v8L16 32H8v-8Z" fill="currentColor" opacity=".45" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 40 40" fill="none">
      <path d="M12 5h16l7 7v16l-7 7H12l-7-7V15" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="round" />
      <path d="m12 29 17-17" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
}
