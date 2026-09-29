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
