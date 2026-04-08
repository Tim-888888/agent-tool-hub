/**
 * README markdown parser.
 * Per D-03: extract features and installGuide from README content.
 */

/**
 * Extract feature list items from a README.
 * Looks for headings like "## Features", "## What it does", "## Capabilities".
 * Returns list items found under the heading.
 */
export function extractFeatures(readme: string): string[] {
  const section = readme.match(
    /##\s+(?:Features|What it does|Capabilities)\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  );
  if (!section) return [];

  return section[1]
    .split('\n')
    .filter((line) => line.match(/^[-*]\s+/))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

/**
 * Extract installation instructions from a README.
 * Looks for headings like "## Installation", "## Install", "## Setup", "## Getting Started".
 * Returns the raw markdown content under that heading, or null if not found.
 */
export function extractInstallGuide(readme: string): string | null {
  const section = readme.match(
    /##\s+(?:Installation|Install|Setup|Getting Started)\s*\n([\s\S]*?)(?=\n##\s|$)/i,
  );
  return section ? section[1].trim() : null;
}
