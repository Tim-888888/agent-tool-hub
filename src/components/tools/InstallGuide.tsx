interface InstallGuideProps {
  guide: string;
}

export default function InstallGuide({ guide }: InstallGuideProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <pre className="overflow-x-auto text-sm text-[var(--text-primary)]">
        <code>{guide}</code>
      </pre>
    </div>
  );
}
