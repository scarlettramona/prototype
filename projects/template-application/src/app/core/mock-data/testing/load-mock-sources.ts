/**
 * Test helper: reads the real CSV exports from disk (specs run in Node), so
 * generator and service tests use the same data the app serves.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildIllDataset } from '../../ill/ill-generator';
import { parseIllSource } from '../../ill/ill-source';
import { buildVnvDataset } from '../../vnv/vnv-generator';
import { parseVnvSource } from '../../vnv/vnv-source';
import { MOCK_DATA_CONFIG } from '../mock-data.config';

const ROOT = resolve(process.cwd(), 'projects/template-application/public/mock-data');

export function readMockFile(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

export function loadVnvSource() {
  return parseVnvSource(readMockFile('vnv/vnv-readings.csv'), readMockFile('vnv/vnv-metadata.csv'));
}

export function loadIllSource() {
  return parseIllSource(readMockFile('ill/ill-scans.csv'), readMockFile('ill/ill-scan-metadata.csv'));
}

export function buildTestVnvDataset() {
  return buildVnvDataset(loadVnvSource(), MOCK_DATA_CONFIG);
}

export function buildTestIllDataset() {
  return buildIllDataset(loadIllSource(), MOCK_DATA_CONFIG);
}
