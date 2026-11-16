import { computed, inject, Injectable, signal } from '@angular/core';
import { defaultParameters } from '../../core/ill/ill-analysis';
import { IllMockService } from '../../core/ill/ill-mock.service';
import type { ParameterPreset, Scan, ScanQi, ScanQuery, ScanSummary } from '../../core/ill/ill.models';
import { parseUsDate } from '../../core/mock-data/dates';
import { MOCK_DATA_CONFIG } from '../../core/mock-data/mock-data.config';
import type { ResolvedIllLibraryState } from '../../core/prototype-state/resolve-prototype-state';
import { checkState } from '../../core/selection/check-state';
import { groupByWell, matchesSearch, recentWells } from './library-model';

/** The Load scans form's defaults (Figma 1:2014). */
export function defaultScanQuery(): ScanQuery {
  return {
    start: parseUsDate(MOCK_DATA_CONFIG.ill.recentRangeStart),
    end: parseUsDate(MOCK_DATA_CONFIG.ill.recentRangeEnd),
    wellIds: [],
    qi: 'Any',
    analysis: 'Any',
  };
}

export interface ScanReview {
  qi: ScanQi;
  scanComment: string;
  vnvComment: string;
}

function summary({ points: _points, ...rest }: Scan): ScanSummary {
  return rest;
}

/** Scan library state. Provided by the library page. */
@Injectable()
export class IllLibraryStore {
  private readonly service = inject(IllMockService);
  private loadToken = 0;

  readonly query = signal<ScanQuery>(defaultScanQuery());
  /** The Load scans form is open (before the first load, or after Edit filters). */
  readonly formOpen = signal(true);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly results = signal<ScanSummary[]>([]);

  readonly search = signal('');
  readonly grouped = signal(false);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly expandedId = signal<string | null>(null);
  /** The expanded scan with its depth points. */
  readonly expandedScan = signal<Scan | null>(null);
  /** The expanded scan's well's reference scan, drawn beside it; `null` when the row is the reference. */
  readonly expandedReference = signal<Scan | null>(null);
  readonly busy = signal(false);
  /** The parameter presets, for the expanded row's Parameters / Saved on / Saved by. */
  readonly presets = signal<readonly ParameterPreset[]>([]);

  /** Every well, and the ones with a recent scan (for the Well field's `*`). */
  readonly wellIds = signal<string[]>([]);
  readonly recent = signal<ReadonlySet<string>>(new Set());

  readonly visible = computed(() => this.results().filter((s) => matchesSearch(s, this.search())));
  readonly groups = computed(() => groupByWell(this.visible()));

  readonly headerCheck = computed(() => checkState(this.visible().map((s) => this.selectedIds().has(s.id))));
  readonly selected = computed(() => this.results().filter((s) => this.selectedIds().has(s.id)));
  readonly canPerform = computed(() => this.selected().length > 0 && !this.busy());
  readonly canSave = computed(() => this.selected().some((s) => !!s.analysis.unsaved) && !this.busy());

  private wellsLoaded?: Promise<void>;

  /** The Well field's options and recent markers, once. */
  loadWells(): Promise<void> {
    this.wellsLoaded ??= this.service
      .searchScans({ start: 0, end: parseUsDate(MOCK_DATA_CONFIG.ill.scanRangeEnd), wellIds: [], qi: 'Any', analysis: 'Any' })
      .then((all) => {
        this.wellIds.set([...new Set(all.map((s) => s.wellId))].sort());
        this.recent.set(recentWells(all, parseUsDate(MOCK_DATA_CONFIG.ill.scanRangeEnd)));
      });
    return this.wellsLoaded;
  }

  async loadScans(query: ScanQuery): Promise<void> {
    const token = ++this.loadToken;
    this.query.set(query);
    this.formOpen.set(false);
    this.loading.set(true);
    this.selectedIds.set(new Set());
    this.collapse();
    try {
      const [results, presets] = await Promise.all([this.service.searchScans(query), this.service.getPresets()]);
      if (token !== this.loadToken) return;
      this.presets.set(presets);
      this.results.set(results);
      this.loaded.set(true);
    } finally {
      if (token === this.loadToken) this.loading.set(false);
    }
  }

  /** Reset: back to the form's defaults. */
  reset(): void {
    this.query.set(defaultScanQuery());
  }

  editFilters(): void {
    this.formOpen.set(true);
  }

  toggleSelected(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  setSelected(ids: readonly string[], on: boolean): void {
    const next = new Set(this.selectedIds());
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    this.selectedIds.set(next);
  }

  groupCheck(ids: readonly string[]) {
    return checkState(ids.map((id) => this.selectedIds().has(id)));
  }

  /** Expands a row (or collapses it if it's open), fetching its depth points. */
  async expand(id: string): Promise<void> {
    if (this.expandedId() === id) {
      this.collapse();
      return;
    }
    this.expandedId.set(id);
    this.expandedScan.set(null);
    this.expandedReference.set(null);
    const wellId = this.results().find((s) => s.id === id)?.wellId;
    const [[scan], reference] = await Promise.all([this.service.getScans([id]), wellId ? this.service.getReferenceScan(wellId) : Promise.resolve(null)]);
    if (this.expandedId() !== id) return;
    this.expandedReference.set(reference && reference.id !== id ? reference : null);
    this.expandedScan.set(scan ?? null);
  }

  collapse(): void {
    this.expandedId.set(null);
    this.expandedScan.set(null);
    this.expandedReference.set(null);
  }

  /** The preset a scan's shown analysis used (or Default when it has none). */
  presetFor(scan: ScanSummary): ParameterPreset | null {
    const name = (scan.analysis.unsaved ?? scan.analysis.saved)?.parameters.preset ?? 'Default';
    return this.presets().find((p) => p.parameters.preset === name) ?? null;
  }

  /** Makes `scanId` its well's reference scan: the Reference tag moves, and an open row redraws. */
  async setReference(scanId: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      this.replace(await this.service.setReferenceScan(scanId));
      await this.reloadReference();
    } finally {
      this.busy.set(false);
    }
  }

  /** Re-reads the expanded row's reference scan (after the reference changes). */
  private async reloadReference(): Promise<void> {
    const scan = this.expandedScan();
    if (!scan) return;
    const reference = await this.service.getReferenceScan(scan.wellId);
    if (this.expandedScan()?.id === scan.id) this.expandedReference.set(reference && reference.id !== scan.id ? reference : null);
  }

  /** Re-reads the presets after Save as default in the focus view. */
  async refreshPresets(): Promise<void> {
    this.presets.set(await this.service.getPresets());
  }

  /** Perform analysis: the Default preset on every selected scan (creates unsaved, blue results). */
  async performAnalysis(): Promise<void> {
    const ids = this.selected().map((s) => s.id);
    const preset = this.presets().find((p) => p.parameters.preset === 'Default')?.parameters ?? defaultParameters();
    await this.mutate(ids, (id) => this.service.runAnalysis(id, preset));
  }

  /** Save analysis: commits the selected scans' unsaved results. */
  async saveAnalysis(): Promise<void> {
    const ids = this.selected()
      .filter((s) => s.analysis.unsaved)
      .map((s) => s.id);
    await this.mutate(ids, (id) => this.service.saveAnalysis(id));
  }

  /** The expanded row's Save analysis: unsaved results (if any) plus QI and comments. */
  async saveRow(id: string, review: ScanReview): Promise<void> {
    await this.mutate([id], async (scanId) => {
      const scan = this.results().find((s) => s.id === scanId);
      if (scan?.analysis.unsaved) await this.service.saveAnalysis(scanId);
      await this.service.reviewScans({ scanIds: [scanId], qi: review.qi, scanComment: review.scanComment, vnvComment: review.vnvComment });
    });
  }

  /** Sets everything from a `?state=` fixture. */
  async applyState(state: ResolvedIllLibraryState): Promise<void> {
    this.query.set(state.query);
    this.grouped.set(state.groupByWell);
    this.search.set('');
    if (!state.loaded) {
      this.loadToken++;
      this.formOpen.set(true);
      this.loaded.set(false);
      this.results.set([]);
      this.selectedIds.set(new Set());
      this.collapse();
      return;
    }
    await this.loadScans(state.query);
    this.selectedIds.set(new Set(state.selectedScanIds));
    if (state.performOnSelection) await this.performAnalysis();
    if (state.expandedScanId) await this.expand(state.expandedScanId);
  }

  /** Re-reads scans changed elsewhere (the focus view) so their rows stay current. */
  async refresh(ids: readonly string[]): Promise<void> {
    const listed = new Set(this.results().map((r) => r.id));
    const present = ids.filter((id) => listed.has(id));
    if (present.length) this.replace(await this.service.getScans(present));
    await this.reloadReference();
  }

  /** Runs `action` per scan, then refreshes those rows (and the expanded scan) in place. */
  private async mutate(ids: readonly string[], action: (id: string) => Promise<unknown>): Promise<void> {
    if (ids.length === 0) return;
    this.busy.set(true);
    try {
      for (const id of ids) await action(id);
      this.replace(await this.service.getScans(ids));
    } finally {
      this.busy.set(false);
    }
  }

  private replace(fresh: readonly Scan[]): void {
    const byId = new Map(fresh.map((s) => [s.id, s]));
    this.results.update((rows) => rows.map((r) => (byId.has(r.id) ? summary(byId.get(r.id)!) : r)));
    const open = this.expandedId();
    if (open && byId.has(open)) this.expandedScan.set(byId.get(open)!);
  }
}
