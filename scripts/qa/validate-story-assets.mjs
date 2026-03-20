import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const matrixPath = path.join(repoRoot, 'docs/qa/story-matrix.md');
const e2eDir = path.join(repoRoot, 'tests/e2e');
const plansDir = path.join(repoRoot, 'docs/plans');

function splitTableLine(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function parseMatrixStoryIds(markdown) {
  const lines = markdown.split('\n');
  const tableStart = lines.findIndex((line) => line.startsWith('| Story ID |'));
  if (tableStart === -1) {
    throw new Error(`Could not find story matrix table in ${matrixPath}`);
  }

  const headers = splitTableLine(lines[tableStart]);
  const storyIndex = headers.indexOf('Story ID');
  if (storyIndex === -1) {
    throw new Error('Story matrix table is missing the "Story ID" column');
  }

  const ids = [];
  for (let i = tableStart + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|')) {
      break;
    }

    const cells = splitTableLine(line);
    ids.push(cells[storyIndex]);
  }

  return ids;
}

function listFiles(dir, predicate) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function parseCoveredStoryIds(content) {
  const match = content.match(/Covered story ids:\s*([\s\S]*?)\*\s*Persona:/);
  if (!match) {
    return null;
  }

  return [...match[1].matchAll(/`?([A-Z]{3}-\d{3})`?/g)].map((result) => result[1]);
}

function parseQaStoriesAffected(content) {
  const match = content.match(/## QA Stories Affected\s*([\s\S]*?)(?:\n## |\n# |$)/);
  if (!match) {
    return null;
  }

  return [...match[1].matchAll(/`?([A-Z]{3}-\d{3})`?/g)].map((result) => result[1]);
}

function relative(filePath) {
  return path.relative(repoRoot, filePath);
}

function validate() {
  const matrixIds = parseMatrixStoryIds(fs.readFileSync(matrixPath, 'utf8'));
  const uniqueMatrixIds = new Set(matrixIds);
  const duplicateMatrixIds = matrixIds.filter((id, index) => matrixIds.indexOf(id) !== index);

  const errors = [];
  const warnings = [];

  if (duplicateMatrixIds.length > 0) {
    errors.push(`Duplicate story ids in story matrix: ${[...new Set(duplicateMatrixIds)].join(', ')}`);
  }

  const e2eFiles = listFiles(e2eDir, (name) => name.endsWith('.spec.ts'));
  for (const file of e2eFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const ids = parseCoveredStoryIds(content);

    if (ids === null) {
      warnings.push(`Missing "Covered story ids" header: ${relative(file)}`);
      continue;
    }

    const unknownIds = ids.filter((id) => !uniqueMatrixIds.has(id));
    if (unknownIds.length > 0) {
      errors.push(`Unknown story ids in ${relative(file)}: ${unknownIds.join(', ')}`);
    }
  }

  const planFiles = listFiles(plansDir, (name) => /^(feat|fix)-.*\.md$/.test(name));
  for (const file of planFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const ids = parseQaStoriesAffected(content);

    if (ids === null) {
      warnings.push(`Missing "QA Stories Affected" section: ${relative(file)}`);
      continue;
    }

    const unknownIds = ids.filter((id) => !uniqueMatrixIds.has(id));
    if (unknownIds.length > 0) {
      errors.push(`Unknown QA story ids in ${relative(file)}: ${unknownIds.join(', ')}`);
    }
  }

  const lines = [
    'QA story asset validation',
    `- Story ids in matrix: ${matrixIds.length}`,
    `- E2E specs scanned: ${e2eFiles.length}`,
    `- Plan docs scanned: ${planFiles.length}`,
    '',
  ];

  if (errors.length === 0) {
    lines.push('Errors: none');
  } else {
    lines.push('Errors:');
    for (const error of errors) {
      lines.push(`- ${error}`);
    }
  }

  if (warnings.length === 0) {
    lines.push('', 'Warnings: none');
  } else {
    lines.push('', 'Warnings:');
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

validate();
