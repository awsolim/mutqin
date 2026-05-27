type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage">
          {eyebrow}
        </p>
      ) : null}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description ? (
          <p className="max-w-xl text-sm leading-6 text-ink/70">{description}</p>
        ) : null}
      </div>
    </header>
  );
}
