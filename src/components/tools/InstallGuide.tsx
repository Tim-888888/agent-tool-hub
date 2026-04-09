interface InstallGuideProps {
  guide: string | Record<string, unknown>;
}

export default function InstallGuide({ guide }: InstallGuideProps) {
  const content = typeof guide === 'string' ? guide : JSON.stringify(guide, null, 2);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
        <code>{content}</code>
      </pre>
    </div>
  );
}
