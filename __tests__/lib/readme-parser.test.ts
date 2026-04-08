// @jest-environment node
import { extractFeatures, extractInstallGuide } from '@/lib/readme-parser';

describe('extractFeatures', () => {
  it('extracts features from "## Features" heading', () => {
    const readme = `# My Tool

Some intro text.

## Features

- Feature A
- Feature B
- Feature C

## Other Section

Something else.
`;
    const result = extractFeatures(readme);
    expect(result).toEqual(['Feature A', 'Feature B', 'Feature C']);
  });

  it('extracts features from "## What it does" heading', () => {
    const readme = `# My Tool

## What it does

- Foo
- Bar
`;
    const result = extractFeatures(readme);
    expect(result).toEqual(['Foo', 'Bar']);
  });

  it('returns empty array when no features heading found', () => {
    const readme = `# My Tool

## Installation

npm install my-tool
`;
    const result = extractFeatures(readme);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    const result = extractFeatures('');
    expect(result).toEqual([]);
  });

  it('handles asterisk list items', () => {
    const readme = `## Features

* First feature
* Second feature
`;
    const result = extractFeatures(readme);
    expect(result).toEqual(['First feature', 'Second feature']);
  });

  it('ignores non-list content under heading', () => {
    const readme = `## Features

Some paragraph text here.

- Actual feature

More text.
`;
    const result = extractFeatures(readme);
    expect(result).toEqual(['Actual feature']);
  });
});

describe('extractInstallGuide', () => {
  it('extracts content under "## Installation" heading', () => {
    const readme = `# My Tool

## Installation

npm install foo

## Other

Bar
`;
    const result = extractInstallGuide(readme);
    expect(result).toBe('npm install foo');
  });

  it('extracts content under "## Getting Started" heading', () => {
    const readme = `# My Tool

## Getting Started

Some text here.

More details.
`;
    const result = extractInstallGuide(readme);
    expect(result).toBe('Some text here.\n\nMore details.');
  });

  it('returns null when no install heading found', () => {
    const readme = `# My Tool

## Features

- Something
`;
    const result = extractInstallGuide(readme);
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = extractInstallGuide('');
    expect(result).toBeNull();
  });

  it('extracts content under "## Setup" heading', () => {
    const readme = `# My Tool

## Setup

1. Clone the repo
2. Run npm install
`;
    const result = extractInstallGuide(readme);
    expect(result).toBe('1. Clone the repo\n2. Run npm install');
  });
});
