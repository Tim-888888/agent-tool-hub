/**
 * npm Registry API client.
 * Per D-04: fetch weekly download counts for tools with npmPackage field.
 */

interface NpmDownloadData {
  downloads: number;
  package: string;
  start: string;
  end: string;
}

/**
 * Fetch weekly download count for an npm package.
 * Returns 0 if the package has no downloads or is not found (404).
 * Throws on other HTTP errors.
 */
export async function fetchWeeklyDownloads(
  packageName: string,
): Promise<number> {
  const res = await fetch(
    `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`,
  );

  if (!res.ok) {
    if (res.status === 404) return 0;
    throw new Error(`npm API ${res.status}: ${res.statusText} for ${packageName}`);
  }

  const data: NpmDownloadData = await res.json();
  return data.downloads;
}
