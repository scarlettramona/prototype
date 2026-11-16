import { computed, inject, Injectable, signal } from '@angular/core';
import { defaultParameters } from '../../../core/ill/ill-analysis';
import { IllMockService } from '../../../core/ill/ill-mock.service';
import type { AnalysisParameters, ParameterPreset, Scan } from '../../../core/ill/ill.models';
import type { ResolvedIllFocusState } from '../../../core/prototype-state/resolve-prototype-state';
import { IllLibraryStore } from '../ill-library-store';
import {
  closedScanIds,
  DEPTH_MAX,
  DEPTH_MIN,
  editedFields,
  initialDraft,
  referenceParameters,
  reviewOf,
  sameReview,
  withParam,
  type DepthWindow,
  type ParamGroup,
  type ParamValue,
  type ScanReviewDraft,
} from './focus-model';

export const ALL_TAB = 'all';

/**
 * The focus view's state: one well's scans, the open tabs, the shared zoom
 * window, visibility, and per-scan drafts (parameters and review) until they
 * are run, saved or discarded. Provided by the focus page.
 */
@Injectable()
export class IllFocusStore {
  private readonly service = inject(IllMockService);
  /** The library's store (parent route), kept in step after saves. Absent in tests. */
  private readonly library = inject(IllLibraryStore, { optional: true });

  readonly wellId = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);

  /** Every scan of the well, oldest first. */
  private readonly allScans = signal<readonly Scan[]>([]);
  readonly openIds = signal<readonly string[]>([]);
  /** `all` or a scan id. */
  readonly active = signal<string>(ALL_TAB);

  /** Shared by every tab. `null` = the full profile. */
  readonly window = signal<DepthWindow | null>(null);
  readonly fitY = signal(true);
  readonly hidden = signal<ReadonlySet<string>>(new Set());
  /** The focused scan's Calculated ILL lines (scans legend Saved / Unsaved). */
  readonly lines = signal({ saved: true, unsaved: true });
  readonly legendOpen = signal(false);
  readonly paramsOpen = signal(true);

  private readonly drafts = signal<ReadonlyMap<string, AnalysisParameters>>(new Map());
  private readonly reviews = signal<ReadonlyMap<string, ScanReviewDraft>>(new Map());
  /** A scan's reference after Save as default: its draft, now the Default preset. */
  private readonly references = signal<ReadonlyMap<string, AnalysisParameters>>(new Map());
  /**
   * Groups switched to inputs with Edit (per tab visit). Every group starts
   * read-only; Revert, Run analysis, Save as default and Save analysis switch
   * them back.
   */
  readonly editingGroups = signal<ReadonlySet<ParamGroup>>(new Set());
  /** The presets for the select, each with its saved on / by (from the service). */
  readonly presets = signal<readonly ParameterPreset[]>([]);
  readonly defaultPreset = computed(() => this.presets().find((p) => p.parameters.preset === 'Default') ?? this.presets()[0] ?? null);
  /** The preset named in the draft (its saved on / by sit beside the select). */
  readonly selectedPreset = computed(() => {
    const name = this.draft()?.preset;
    return this.presets().find((p) => p.parameters.preset === name) ?? this.defaultPreset();
  });

  private loadToken = 0;

  readonly scanById = computed(() => new Map(this.allScans().map((s) => [s.id, s])));
  readonly openScans = computed(() => {
    const byId = this.scanById();
    return this.openIds().flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  });
  readonly closedScans = computed(() => {
    const byId = this.scanById();
    return closedScanIds(
      this.allScans().map((s) => s.id),
      this.openIds(),
    ).map((id) => byId.get(id)!);
  });
  readonly focused = computed(() => (this.active() === ALL_TAB ? null : (this.scanById().get(this.active()) ?? null)));
  /** On the chart: open scans not hidden. The focused scan can't be hidden. */
  readonly visibleScans = computed(() => {
    const hidden = this.hidden();
    const focus = this.active();
    return this.openScans().filter((s) => s.id === focus || !hidden.has(s.id));
  });
  readonly atFullRange = computed(() => this.window() === null);

  // ── The focused scan's drafts ──
  readonly reference = computed(() => {
    const s = this.focused();
    return s ? (this.references().get(s.id) ?? referenceParameters(s, this.defaults())) : null;
  });
  readonly draft = computed(() => {
    const s = this.focused();
    return s ? this.draftFor(s) : null;
  });
  readonly edited = computed(() => {
    const d = this.draft();
    const r = this.reference();
    return d && r ? editedFields(d, r) : new Set<string>();
  });
  readonly review = computed(() => {
    const s = this.focused();
    return s ? (this.reviews().get(s.id) ?? reviewOf(s)) : null;
  });
  readonly hasUnsaved = computed(() => !!this.focused()?.analysis.unsaved);
  readonly canSave = computed(() => {
    const s = this.focused();
    return !!s && !this.busy() && this.dirty(s.id);
  });
  /** Run analysis is primary until there's something to save; then Save analysis is. */
  readonly primaryAction = computed<'run' | 'save'>(() => (this.canSave() ? 'save' : 'run'));

  /** Unsaved results or an edited review: the tab shows a dot instead of ×. */
  dirty(id: string): boolean {
    const s = this.scanById().get(id);
    if (!s) return false;
    const review = this.reviews().get(id);
    return !!s.analysis.unsaved || (!!review && !sameReview(review, reviewOf(s)));
  }

  readonly dirtyIds = computed(() => this.openIds().filter((id) => this.dirty(id)));

  // ── Loading ──

  /** Opens every scan of `wellId` (Open in focus view), on `tab` if given. */
  async load(wellId: string, tab?: string | null): Promise<void> {
    const token = ++this.loadToken;
    this.wellId.set(wellId);
    this.loading.set(true);
    try {
      const [scans, presets] = await Promise.all([this.service.getWellScans(wellId), this.service.getPresets()]);
      if (token !== this.loadToken) return;
      this.presets.set(presets);
      this.reset(scans);
      this.openIds.set(scans.map((s) => s.id));
      this.active.set(tab && scans.some((s) => s.id === tab) ? tab : ALL_TAB);
    } finally {
      if (token === this.loadToken) this.loading.set(false);
    }
  }

  /** Sets everything from a `?state=` fixture. */
  async applyState(state: ResolvedIllFocusState): Promise<void> {
    const token = ++this.loadToken;
    this.wellId.set(state.wellId);
    this.loading.set(true);
    try {
      const [scans, presets] = await Promise.all([this.service.getWellScans(state.wellId), this.service.getPresets()]);
      if (token !== this.loadToken) return;
      this.presets.set(presets);
      this.reset(scans);
      this.openIds.set(state.scanIds);
      this.active.set(state.activeTab);
      this.window.set(state.zoom ? { start: Math.min(...state.zoom), end: Math.max(...state.zoom) } : null);
      this.legendOpen.set(state.popover === 'scans-legend');
      if (state.popover === 'scans-legend') {
        // Figma 1:10714: the focused scan and one other shown.
        const others = state.scanIds.filter((id) => id !== state.activeTab);
        this.hidden.set(new Set(others.filter((_, i) => i !== 3)));
      }
      if (state.name === 'ill-scan-zoomed' && state.activeTab !== ALL_TAB) {
        // Figma 1:8968: ILL method in edit, ILL Normal Lower Range 12.000 (saved 10.500).
        this.editGroup('illMethod');
        this.setField('illMethod', 'normalLowerRange', 12);
      }
      if (state.run && state.activeTab !== ALL_TAB) {
        // A re-run of a saved scan edits one field (Figma 1:8968); a first run uses the Default preset.
        if (this.focused()?.analysis.saved) this.setField('illMethod', 'normalLowerRange', 12);
        await this.run();
      }
    } finally {
      if (token === this.loadToken) this.loading.set(false);
    }
  }

  private reset(scans: readonly Scan[]): void {
    this.allScans.set(scans);
    this.window.set(null);
    this.hidden.set(new Set());
    this.lines.set({ saved: true, unsaved: true });
    this.legendOpen.set(false);
    this.drafts.set(new Map());
    this.reviews.set(new Map());
    this.references.set(new Map());
    this.editingGroups.set(new Set());
  }

  // ── Tabs ──

  select(tab: string): void {
    if (tab === this.active()) return;
    this.active.set(tab);
    this.editingGroups.set(new Set());
    this.lines.set({ saved: true, unsaved: true });
  }

  /** Reopens a closed scan (Add scans) and switches to it. Keeps oldest-first order. */
  open(id: string): void {
    if (!this.openIds().includes(id)) {
      const order = this.allScans().map((s) => s.id);
      const next = new Set([...this.openIds(), id]);
      this.openIds.set(order.filter((x) => next.has(x)));
    }
    this.select(id);
  }

  /** Closes a tab, dropping its drafts. Call `discard`/`save` first if it's dirty. */
  close(id: string): void {
    const ids = this.openIds();
    const i = ids.indexOf(id);
    if (i < 0) return;
    const rest = ids.filter((x) => x !== id);
    this.openIds.set(rest);
    this.dropDrafts(id);
    const hidden = new Set(this.hidden());
    hidden.delete(id);
    this.hidden.set(hidden);
    if (this.active() === id) this.select(rest[Math.min(i, rest.length - 1)] ?? ALL_TAB);
  }

  // ── Chart ──

  setWindow(w: DepthWindow | null): void {
    if (!w) {
      this.window.set(null);
      return;
    }
    const start = Math.max(DEPTH_MIN, Math.min(w.start, w.end));
    const end = Math.min(DEPTH_MAX, Math.max(w.start, w.end));
    this.window.set(start <= DEPTH_MIN + 0.001 && end >= DEPTH_MAX - 0.001 ? null : { start, end });
  }

  setHidden(id: string, hidden: boolean): void {
    if (id === this.active()) return;
    const next = new Set(this.hidden());
    if (hidden) next.add(id);
    else next.delete(id);
    this.hidden.set(next);
  }

  /** The All scans row: show all, or hide all but the focused scan. */
  setAllVisible(visible: boolean): void {
    const focus = this.active();
    this.hidden.set(visible ? new Set() : new Set(this.openIds().filter((id) => id !== focus)));
  }

  // ── Parameters ──

  setField(group: ParamGroup, key: string, value: ParamValue): void {
    const s = this.focused();
    if (!s) return;
    this.setDraft(s.id, withParam(this.draftFor(s), group, key, value));
  }

  revert(group: ParamGroup): void {
    const s = this.focused();
    const ref = this.reference();
    if (!s || !ref) return;
    this.setDraft(s.id, { ...this.draftFor(s), [group]: structuredClone(ref[group]) });
    const editing = new Set(this.editingGroups());
    editing.delete(group);
    this.editingGroups.set(editing);
  }

  editGroup(group: ParamGroup): void {
    this.editingGroups.set(new Set([...this.editingGroups(), group]));
  }

  loadPreset(name: string): void {
    const s = this.focused();
    const preset = this.presets().find((p) => p.parameters.preset === name);
    if (s && preset) this.setDraft(s.id, structuredClone(preset.parameters));
  }

  /**
   * Save as default: the current values become the Default preset (saved now,
   * by the current user). They are the scan's new reference, so the edit dots
   * clear, and every group goes back to read mode.
   */
  async saveAsDefault(): Promise<void> {
    const s = this.focused();
    const d = this.draft();
    if (!s || !d || this.busy()) return;
    const params: AnalysisParameters = { ...structuredClone(d), preset: 'Default' };
    this.busy.set(true);
    try {
      this.presets.set(await this.service.savePreset(params));
      this.setDraft(s.id, params);
      this.references.update((m) => new Map(m).set(s.id, structuredClone(params)));
      this.editingGroups.set(new Set());
      await this.library?.refreshPresets();
    } finally {
      this.busy.set(false);
    }
  }

  // ── Review ──

  setReview(patch: Partial<ScanReviewDraft>): void {
    const s = this.focused();
    const r = this.review();
    if (!s || !r) return;
    this.reviews.update((m) => new Map(m).set(s.id, { ...r, ...patch }));
  }

  // ── Run / save / discard ──

  /** Runs the analysis with the draft parameters: the scan gets unsaved results. */
  async run(): Promise<void> {
    const s = this.focused();
    const d = this.draft();
    if (!s || !d || this.busy()) return;
    await this.mutate([s.id], (id) => this.service.runAnalysis(id, d));
    // Back to read mode; edited fields keep their dot and saved value until saved.
    this.editingGroups.set(new Set());
  }

  /** Saves the focused scan (or `ids`): unsaved results and any review edits. */
  async save(ids: readonly string[] = this.focusedIds()): Promise<void> {
    await this.mutate(ids, async (id) => {
      const scan = this.scanById().get(id);
      if (!scan) return;
      if (scan.analysis.unsaved) await this.service.saveAnalysis(id);
      const review = this.reviews().get(id);
      if (review && !sameReview(review, reviewOf(scan))) {
        await this.service.reviewScans({ scanIds: [id], qi: review.qi, scanComment: review.scanComment.trim(), vnvComment: review.vnvComment.trim() });
      }
    });
    for (const id of ids) this.dropDrafts(id);
    this.editingGroups.set(new Set());
  }

  /** Drops unsaved results (and review edits) of the focused scan (or `ids`). */
  async discard(ids: readonly string[] = this.focusedIds()): Promise<void> {
    await this.mutate(ids, async (id) => {
      if (this.scanById().get(id)?.analysis.unsaved) await this.service.discardAnalysis(id);
    });
    for (const id of ids) this.dropDrafts(id);
    this.editingGroups.set(new Set());
  }

  private focusedIds(): string[] {
    const s = this.focused();
    return s ? [s.id] : [];
  }

  private async mutate(ids: readonly string[], action: (id: string) => Promise<unknown>): Promise<void> {
    if (ids.length === 0) return;
    this.busy.set(true);
    try {
      for (const id of ids) await action(id);
      const fresh = await this.service.getScans(ids);
      const byId = new Map(fresh.map((s) => [s.id, s]));
      this.allScans.update((list) => list.map((s) => byId.get(s.id) ?? s));
      await this.library?.refresh(ids);
    } finally {
      this.busy.set(false);
    }
  }

  private draftFor(scan: Scan): AnalysisParameters {
    return this.drafts().get(scan.id) ?? initialDraft(scan, this.defaults());
  }

  /** The Default preset's parameters (the built-in values until presets load). */
  private defaults(): AnalysisParameters {
    return this.defaultPreset()?.parameters ?? defaultParameters();
  }

  private setDraft(id: string, draft: AnalysisParameters): void {
    this.drafts.update((m) => new Map(m).set(id, draft));
  }

  private dropDrafts(id: string): void {
    if (this.drafts().has(id)) {
      const m = new Map(this.drafts());
      m.delete(id);
      this.drafts.set(m);
    }
    if (this.reviews().has(id)) {
      const m = new Map(this.reviews());
      m.delete(id);
      this.reviews.set(m);
    }
    if (this.references().has(id)) {
      const m = new Map(this.references());
      m.delete(id);
      this.references.set(m);
    }
  }
}
