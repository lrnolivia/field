import { useEffect, useMemo, useState } from 'react';
import Modal from '@/design-system/Modal';
import { fetchFieldBuildInfo, type FieldBuildInfo } from '@/backend/build-info';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function AboutRow({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="grid grid-cols-[82px_minmax(0,1fr)] items-baseline gap-3 py-1.5">
      <span className="text-[10px] text-[var(--text-tertiary)]">{label}</span>
      <span
        className="min-w-0 select-text truncate text-[11px] text-[var(--text-primary)]"
        title={title ?? value}
      >
        {value}
      </span>
    </div>
  );
}

export default function AboutFieldModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [build, setBuild] = useState<FieldBuildInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setBuild(null);
    setError(null);
    setCopied(false);

    void fetchFieldBuildInfo((input, init) => fetch(input, { ...init, signal: controller.signal }))
      .then((value) => {
        if (!controller.signal.aborted) setBuild(value);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => controller.abort();
  }, [isOpen]);

  const diagnostics = useMemo(() => {
    if (!build) return '';
    return [
      'field diagnostics',
      'Version: ' + build.version,
      'Commit: ' + build.commitSha,
      'Environment: ' + build.environment,
      'Built: ' + (build.builtAt ?? 'unknown'),
      'Deployed: ' + (build.deployedAt ?? 'unknown'),
      'Cloudflare version: ' + (build.deploymentId ?? 'unknown'),
      'URL: ' + (typeof window === 'undefined' ? 'unknown' : window.location.href),
      'Browser: ' + (typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent),
    ].join('\n');
  }, [build]);

  const copyDiagnostics = async () => {
    if (!diagnostics || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(diagnostics);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About field" width={324}>
      <div className="p-4">
        <div className="flex items-center gap-3 pb-3">
          <span
            aria-hidden
            className="block h-9 w-9 shrink-0 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: 'var(--field-app-icon)' }}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-4 text-[var(--text-primary)]">field</div>
            <div className="text-[10px] leading-4 text-[var(--text-tertiary)]">by loew.fi</div>
          </div>
        </div>

        <div className="border-t border-[var(--border-light)] pt-2">
          {build ? (
            <>
              <AboutRow label="Version" value={build.version} />
              <AboutRow label="Build" value={build.shortSha} title={build.commitSha} />
              <AboutRow label="Environment" value={build.environment} />
              <AboutRow label="Deployed" value={formatTimestamp(build.deployedAt)} title={build.deployedAt ?? undefined} />
              <AboutRow label="Cloudflare" value={build.deploymentId ?? '—'} />
            </>
          ) : (
            <div className="py-3 text-[11px] text-[var(--text-secondary)]">
              {error ? 'Build information unavailable.' : 'Loading build information…'}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => { void copyDiagnostics(); }}
          disabled={!build}
          className="mt-3 flex h-8 w-full items-center justify-center rounded-[5px] border border-[var(--border-light)] bg-transparent px-3 text-[11px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-40"
        >
          {copied ? 'Copied diagnostics' : 'Copy diagnostics'}
        </button>
      </div>
    </Modal>
  );
}
