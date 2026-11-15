#!/usr/bin/env node
/**
 * Structural architecture checks that the ESLint boundary rules cannot express,
 * because they are about where files sit rather than what they import.
 *
 * Run by `npm run verify`, so CI fails on a violation.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const APP_SRC = 'projects/template-application/src';
const FEATURE_ROOT = join(APP_SRC, 'app', 'feature');
const CORE_ROOT = join(APP_SRC, 'app', 'core');

/** Maximum feature nesting depth (project parameter). 1 = a feature may have sub-features; they may not. */
const MAX_FEATURE_DEPTH = 1;

const failures = [];

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      entries.push(path, ...walk(path));
    } else {
      entries.push(path);
    }
  }
  return entries;
}

function exists(dir) {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

// 1. Feature nesting may not go deeper than the configured limit.
if (exists(FEATURE_ROOT)) {
  for (const path of walk(FEATURE_ROOT)) {
    const depth = relative(FEATURE_ROOT, path).split(sep).filter((s) => s === 'sub-features').length;
    if (depth > MAX_FEATURE_DEPTH) {
      failures.push(
        `${path}: feature nesting deeper than ${MAX_FEATURE_DEPTH}. A sub-feature that wants its own sub-features is usually a first-level feature.`,
      );
    }
  }
}

// 2. core/ is headless: no components, directives or pipes.
if (exists(CORE_ROOT)) {
  for (const path of walk(CORE_ROOT)) {
    if (!path.endsWith('.ts')) {
      continue;
    }
    const decorator = /^\s*@(Component|Directive|Pipe)\s*\(/m.exec(readFileSync(path, 'utf8'));
    if (decorator) {
      failures.push(`${path}: core/ must not contain components, directives or pipes (found @${decorator[1]}).`);
    }
  }
}

if (failures.length > 0) {
  console.error('Architecture check failed:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log('Architecture check passed.');
