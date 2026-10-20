export type FieldBuildInfo = {
  version: string;
  commitSha: string;
  shortSha: string;
  builtAt: string | null;
  environment: string;
  deployedAt: string | null;
  deploymentId: string | null;
};

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function fetchFieldBuildInfo(fetchImpl: typeof fetch = fetch): Promise<FieldBuildInfo> {
  const response = await fetchImpl('/api/build', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Build info request failed (' + response.status + ')');

  const value = await response.json() as Record<string, unknown>;
  const version = asNullableString(value.version) ?? 'unknown';
  const commitSha = asNullableString(value.commitSha) ?? 'unknown';
  const shortSha = asNullableString(value.shortSha)
    ?? (commitSha === 'unknown' ? commitSha : commitSha.slice(0, 8));

  return {
    version,
    commitSha,
    shortSha,
    builtAt: asNullableString(value.builtAt),
    environment: asNullableString(value.environment) ?? 'Unknown',
    deployedAt: asNullableString(value.deployedAt),
    deploymentId: asNullableString(value.deploymentId),
  };
}

/** Build identity compiled into this bundle by vite.config.ts `define`. */
declare const __FIELD_LOADED_BUILD__: { version?: string; commitSha?: string; shortSha?: string; builtAt?: string } | undefined;

export type LoadedFieldBuild = { version: string; commitSha: string; shortSha: string; builtAt: string | null };

/** The build this running bundle was compiled from. `unknown` in tests and in
 *  bundles built without the define (e.g. sandbox configs). */
export const loadedFieldBuild: LoadedFieldBuild = (() => {
  const raw = typeof __FIELD_LOADED_BUILD__ !== 'undefined' ? __FIELD_LOADED_BUILD__ : undefined;
  const commitSha = asNullableString(raw?.commitSha) ?? 'unknown';
  return {
    version: asNullableString(raw?.version) ?? 'unknown',
    commitSha,
    shortSha: asNullableString(raw?.shortSha) ?? (commitSha === 'unknown' ? commitSha : commitSha.slice(0, 8)),
    builtAt: asNullableString(raw?.builtAt),
  };
})();

/** True only when BOTH identities are known and differ — an unknown side never
 *  claims an update (no false "new version" prompts in dev/tests). */
export function deployedBuildDiffers(loaded: Pick<LoadedFieldBuild, 'commitSha'>, deployed: Pick<FieldBuildInfo, 'commitSha'>): boolean {
  if (loaded.commitSha === 'unknown' || deployed.commitSha === 'unknown') return false;
  return loaded.commitSha !== deployed.commitSha;
}
