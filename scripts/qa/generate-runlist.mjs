import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const matrixPath = path.join(repoRoot, 'docs/qa/story-matrix.md');

function parseArgs(argv) {
  const options = {
    status: ['release-critical'],
    capability: [],
    priority: [],
    story: [],
    format: 'markdown',
    output: '',
  };

  for (const arg of argv) {
    if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length).split(',').filter(Boolean);
    } else if (arg.startsWith('--capability=')) {
      options.capability = arg.slice('--capability='.length).split(',').filter(Boolean);
    } else if (arg.startsWith('--priority=')) {
      options.priority = arg.slice('--priority='.length).split(',').filter(Boolean);
    } else if (arg.startsWith('--story=')) {
      options.story = arg.slice('--story='.length).split(',').filter(Boolean);
    } else if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length);
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (arg === '--all') {
      options.status = [];
    }
  }

  return options;
}

function splitTableLine(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function parseMatrix(markdown) {
  const lines = markdown.split('\n');
  const tableStart = lines.findIndex((line) => line.startsWith('| Story ID |'));
  if (tableStart === -1) {
    throw new Error(`Could not find story matrix table in ${matrixPath}`);
  }

  const headers = splitTableLine(lines[tableStart]);
  const rows = [];

  for (let i = tableStart + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|')) {
      break;
    }

    const cells = splitTableLine(line);
    if (cells.length !== headers.length) {
      continue;
    }

    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  }

  return rows;
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function matchesFilter(row, options) {
  const matchesStatus =
    options.status.length === 0 || options.status.some((status) => normalize(row['Release Status']) === normalize(status));
  const matchesCapability =
    options.capability.length === 0 || options.capability.some((capability) => normalize(row.Capability) === normalize(capability));
  const matchesPriority =
    options.priority.length === 0 || options.priority.some((priority) => normalize(row.Priority) === normalize(priority));
  const matchesStory =
    options.story.length === 0 || options.story.some((story) => normalize(row['Story ID']) === normalize(story));

  return matchesStatus && matchesCapability && matchesPriority && matchesStory;
}

function groupByCapability(rows) {
  return rows.reduce((groups, row) => {
    const key = row.Capability;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
    return groups;
  }, new Map());
}

function renderMarkdown(rows, options) {
  const grouped = groupByCapability(rows);
  const statusLabel = options.status.length === 0 ? 'all statuses' : options.status.join(', ');
  const lines = [
    '# QA Story Runlist',
    '',
    `- Source: \`docs/qa/story-matrix.md\``,
    `- Status filter: ${statusLabel}`,
    `- Story count: ${rows.length}`,
    '',
    '## Execution Rules',
    '',
    '- Open the linked capability doc before executing a story.',
    '- Run linked automated tests before manual QA unless the story is `H-required` only.',
    '- Treat `Blocked-env` as a setup gate, not a pass.',
    '- Attach screenshots, traces, or listening notes to failures.',
  ];

  for (const [capability, capabilityRows] of grouped.entries()) {
    lines.push('', `## ${capability}`, '');
    for (const row of capabilityRows) {
      lines.push(`### ${row['Story ID']} ${row.Goal}`);
      lines.push(`- Expected outcome: ${row['Expected Outcome']}`);
      lines.push(`- Priority: ${row.Priority}`);
      lines.push(`- Release status: ${row['Release Status']}`);
      lines.push(`- Automation: ${row.Automation}`);
      lines.push(`- Human QA: ${row['Human QA']}`);
      lines.push(`- Agent setup: ${row['Agent Setup']}`);
      lines.push(`- Browser-only: ${row['Browser-only']}`);
      lines.push(`- Capability doc: ${row['Linked Spec']}`);
      lines.push(`- Tests: ${row['Linked Tests']}`);
      lines.push(`- Plans / issues: ${row['Linked Plans / Issues']}`);
      lines.push('');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function renderJson(rows) {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const markdown = fs.readFileSync(matrixPath, 'utf8');
  const rows = parseMatrix(markdown).filter((row) => matchesFilter(row, options));

  const output =
    options.format === 'json' ? renderJson(rows) : renderMarkdown(rows, options);

  if (options.output) {
    const outputPath = path.resolve(repoRoot, options.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output);
    process.stdout.write(`Wrote QA runlist to ${outputPath}\n`);
    return;
  }

  process.stdout.write(output);
}

main();
