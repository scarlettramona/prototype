import { inject, Injectable } from '@angular/core';
import { parseUsDate } from '../mock-data/dates';
import { delay, MOCK_LATENCY } from '../mock-data/latency';
import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { MockDataService } from '../mock-data/mock-data.service';
import { analyse, cloneParameters, defaultParameters } from './ill-analysis';
import type { AnalysisParameters, ParameterPreset, Scan, ScanQuery, ScanReviewRequest, ScanSummary, Well } from './ill.models';
import { byNewest, matchesScanQuery } from './ill-query';

/**
 * The ILL "backend". Reads resolve after 300–800 ms. Analysis runs, saves,
 * discards and reviews change scans in memory until the page reloads.
 */
@Injectable({ providedIn: 'root' })
export class IllMockService {
  private readonly data = inject(MockDataService);
  private readonly latency = inject(MOCK_LATENCY);
  /** The parameter presets, edited in memory by Save as default. */
  private presets: ParameterPreset[] = [
    {
      parameters: defaultParameters(),
      savedAt: parseUsDate(MOCK_DATA_CONFIG.ill.defaultPreset.savedAt),
      savedBy: MOCK_DATA_CONFIG.ill.defaultPreset.savedBy,
    },
  ];

  async getWells(): Promise<Well[]> {
    const ds = await this.data.illDataset();
    return this.respond([...ds.wells.values()].map((w) => ({ ...w, scanIds: [...w.scanIds] })));
  }

  /** The Scan library search: the Load scans form. Newest first. */
  async searchScans(query: ScanQuery): Promise<ScanSummary[]> {
    const ds = await this.data.illDataset();
    const results = [...ds.scans.values()]
      .filter((s) => matchesScanQuery(s, query))
      .sort(byNewest)
      .map(({ points: _points, ...summary }) => structuredClone(summary));
    return this.respond(results);
  }

  /** Full scans, with depth points, in the order asked. */
  async getScans(ids: readonly string[]): Promise<Scan[]> {
    const ds = await this.data.illDataset();
    return this.respond(ids.flatMap((id) => (ds.scans.has(id) ? [structuredClone(ds.scans.get(id)!)] : [])));
  }

  /** All scans of a well, oldest first. */
  async getWellScans(wellId: string): Promise<Scan[]> {
    const ds = await this.data.illDataset();
    const ids = ds.wells.get(wellId)?.scanIds ?? [];
    return this.respond(ids.map((id) => structuredClone(ds.scans.get(id)!)));
  }

  /** The parameter presets for the select, each with its saved on / by. */
  async getPresets(): Promise<ParameterPreset[]> {
    return this.respond(structuredClone(this.presets));
  }

  /** Save as default: overwrites the preset named `parameters.preset`, saved now by the current user. */
  async savePreset(parameters: AnalysisParameters): Promise<ParameterPreset[]> {
    const preset: ParameterPreset = { parameters: cloneParameters(parameters), savedAt: Date.now(), savedBy: MOCK_DATA_CONFIG.currentUser };
    const i = this.presets.findIndex((p) => p.parameters.preset === parameters.preset);
    this.presets = i < 0 ? [...this.presets, preset] : this.presets.map((p, j) => (j === i ? preset : p));
    return this.respond(structuredClone(this.presets));
  }

  /** Runs the analysis with `parameters`, replacing any unsaved results. */
  async runAnalysis(scanId: string, parameters: AnalysisParameters): Promise<Scan> {
    const scan = await this.scan(scanId);
    scan.analysis.unsaved = {
      parameters: cloneParameters(parameters),
      results: analyse(scan.points, parameters, scan.datetime),
      runAt: Date.now(),
    };
    return this.respond(structuredClone(scan));
  }

  /** Commits the unsaved results. No-op if there are none. */
  async saveAnalysis(scanId: string): Promise<Scan> {
    const scan = await this.scan(scanId);
    const unsaved = scan.analysis.unsaved;
    if (unsaved) {
      scan.analysis.saved = {
        parameters: unsaved.parameters,
        results: unsaved.results,
        savedAt: Date.now(),
        savedBy: MOCK_DATA_CONFIG.currentUser,
      };
      delete scan.analysis.unsaved;
    }
    return this.respond(structuredClone(scan));
  }

  /** Drops the unsaved results. */
  async discardAnalysis(scanId: string): Promise<Scan> {
    const scan = await this.scan(scanId);
    delete scan.analysis.unsaved;
    return this.respond(structuredClone(scan));
  }

  /** Sets scan-level QI and comments. Returns the updated scans. */
  async reviewScans(request: ScanReviewRequest): Promise<ScanSummary[]> {
    const ds = await this.data.illDataset();
    const updated: ScanSummary[] = [];
    for (const id of request.scanIds) {
      const scan = ds.scans.get(id);
      if (!scan) continue;
      scan.qi = request.qi;
      if (request.scanComment !== undefined) scan.scanComment = request.scanComment || undefined;
      if (request.vnvComment !== undefined) scan.vnvComment = request.vnvComment || undefined;
      const { points: _points, ...summary } = scan;
      updated.push(structuredClone(summary));
    }
    return this.respond(updated);
  }

  private async scan(id: string): Promise<Scan> {
    const ds = await this.data.illDataset();
    const scan = ds.scans.get(id);
    if (!scan) throw new Error(`Unknown scan: ${id}`);
    return scan;
  }

  private respond<T>(value: T): Promise<T> {
    return delay(this.latency(), value);
  }
}
