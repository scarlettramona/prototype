import { computed, inject, Injectable, signal } from '@angular/core';
import { QI_VALUES, type Qi } from '../../core/qi/qi.models';
import type { ResolvedVnvState } from '../../core/prototype-state/resolve-prototype-state';
import { VnvMockService } from '../../core/vnv/vnv-mock.service';
import type { Sensor, VnvFarm, VnvLoadResult, VnvLocation } from '../../core/vnv/vnv.models';
import type { DateRangeValue } from '../../ui/components/date-range-field/date-range-field.component';
import type { ContentView } from '../../ui/components/view-switcher/view-switcher.component';
import { DAY_MS, endOfDay, startOfDay } from '../../core/mock-data/dates';
import { groupBySensor, type SensorSeries, type XRange } from './components/vnv-chart/vnv-chart-options';
import { DEFAULT_TABLE_SORT, type TableSort } from './components/vnv-table/vnv-table-rows';

/** A fixture's Load sensors form settings (see `ResolvedVnvState.loadForm`). */
export type LoadFormInit = NonNullable<ResolvedVnvState['loadForm']>;

/**
 * VNV screen state. Provided by `VnvPageComponent`, so it lives as long as the
 * page. Chart and table read the same data, and share one selection.
 */
@Injectable()
export class VnvStore {
  private readonly service = inject(VnvMockService);
  private loadToken = 0;

  readonly location = signal<VnvLocation | null>(null);
  /** The page header's date range (local midnights). */
  readonly range = signal<DateRangeValue>({ start: 0, end: 0 });
  /** Visual only for now (decided 2026-11-15). */
  readonly showAllData = signal(false);
  readonly view = signal<ContentView>('chart');

  readonly result = signal<VnvLoadResult | null>(null);
  readonly loading = signal(false);

  readonly hiddenSensorIds = signal<ReadonlySet<string>>(new Set());
  readonly visibleQi = signal<Qi[]>([...QI_VALUES]);
  readonly baselineSensorId = signal<string | null>(null);
  readonly oosSensorId = signal<string | null>(null);

  /** The chart's zoom window; `null` = the full loaded range. */
  readonly window = signal<XRange | null>(null);
  readonly fitY = signal(true);
  readonly loadFormOpen = signal(false);

  // Review (Phase 4). The selection is shared by chart and table.
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  /** The chart's VNV form popover. (The table docks the form whenever there's a selection.) */
  readonly vnvPopoverOpen = signal(false);
  readonly applying = signal(false);
  readonly tableSort = signal<TableSort>(DEFAULT_TABLE_SORT);
  readonly grouped = signal(false);
  readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  // Load sensors (Phase 5).
  /** The sensors of `location` that are loaded (a subset is allowed). */
  readonly loadedSensorIds = signal<readonly string[]>([]);
  /** The range the loaded data covers (Cancel in the Load sensors popover restores it). */
  readonly loadedRange = signal<DateRangeValue>({ start: 0, end: 0 });
  /** What a `?state=` fixture wants the Load sensors form to show; consumed by the form. */
  readonly loadFormInit = signal<LoadFormInit | null>(null);
  /** The Load sensors tree and every sensor's data range (loaded once). */
  readonly farm = signal<VnvFarm | null>(null);
  readonly sensorIndex = signal<readonly Sensor[]>([]);
  private pickerData?: Promise<void>;

  /** Loads the tree and sensor index for the Load sensors form, once. */
  loadPickerData(): Promise<void> {
    this.pickerData ??= Promise.all([this.service.getFarm(), this.service.getSensorIndex()]).then(([farm, sensors]) => {
      this.farm.set(farm);
      this.sensorIndex.set(sensors);
    });
    return this.pickerData;
  }

  readonly headerSummary = computed(() => {
    const l = this.location();
    return l ? { name: l.id, sensorCount: this.loadedSensorIds().length } : null;
  });

  /** x-extent of the loaded data: the date range, whole days. */
  readonly xRange = computed<XRange>(() => ({ start: this.range().start, end: endOfDay(this.range().end) }));
  readonly effectiveWindow = computed<XRange>(() => this.window() ?? this.xRange());
  readonly atFullRange = computed(() => {
    const w = this.window();
    const x = this.xRange();
    return !w || (w.start <= x.start && w.end >= x.end);
  });

  readonly series = computed<SensorSeries[]>(() => {
    const r = this.result();
    return r ? groupBySensor(r.sensors, r.readings) : [];
  });
  readonly baseline = computed(() => this.result()?.baselines.find((b) => b.sensorId === this.baselineSensorId()) ?? null);
  readonly outOfService = computed(() => this.result()?.outOfService.filter((o) => o.sensorId === this.oosSensorId()) ?? []);

  /** Readings of visible sensors whose QI passes the quality filter: the table's rows. */
  readonly visibleReadings = computed(() => {
    const r = this.result();
    if (!r) return [];
    const hidden = this.hiddenSensorIds();
    const qi = new Set(this.visibleQi());
    return r.readings.filter((x) => !hidden.has(x.sensorId) && qi.has(x.qi));
  });

  readonly selectedReadings = computed(() => {
    const ids = this.selectedIds();
    return ids.size ? (this.result()?.readings.filter((r) => ids.has(r.id)) ?? []) : [];
  });

  /** Pre-fill for the VNV form: the QI every selected reading already shares, if it's assignable. */
  readonly formInitial = computed(() => {
    const sel = this.selectedReadings();
    const qi = sel[0]?.qi;
    return qi && (qi === 'Good' || qi === 'Suspect') && sel.every((r) => r.qi === qi) ? { qi } : null;
  });

  /** Loads a location's sensors (all, or the given subset) for a range, replacing what's loaded. */
  async load(locationId: string, range: DateRangeValue, sensorIds?: readonly string[]): Promise<void> {
    this.loading.set(true); // show the loading state straight away
    const farm = await this.service.getFarm();
    const location = farm.groups.flatMap((g) => g.locations).find((l) => l.id === locationId) ?? null;
    if (!location) throw new Error(`Unknown location: ${locationId}`);
    this.location.set(location);
    this.loadedSensorIds.set(sensorIds?.length ? location.sensorIds.filter((id) => sensorIds.includes(id)) : [...location.sensorIds]);
    this.hiddenSensorIds.set(new Set());
    this.baselineSensorId.set(null);
    this.oosSensorId.set(null);
    await this.fetch(range);
  }

  /** Reloads the same sensors for a new range. */
  reloadRange(range: DateRangeValue): Promise<void> {
    return this.fetch(range);
  }

  /** Sets everything from a `?state=` fixture. */
  async applyState(state: ResolvedVnvState): Promise<void> {
    this.view.set(state.view);
    this.visibleQi.set([...state.visibleQi]);
    this.loadFormOpen.set(state.popover === 'load-form');
    this.fitY.set(true);
    this.loadFormInit.set(state.loadForm ? { ...state.loadForm } : null);
    if (!state.loaded) {
      this.clear();
      if (state.loadForm) this.range.set({ start: state.loadForm.start, end: state.loadForm.end });
      return;
    }
    this.showAllData.set(state.loaded.showAllData);
    const farm = await this.service.getFarm();
    const location = farm.groups.flatMap((g) => g.locations).find((l) => l.id === state.loaded!.locationId) ?? null;
    this.location.set(location);
    this.loadedSensorIds.set([...(location?.sensorIds ?? [])]);
    this.hiddenSensorIds.set(new Set(state.hiddenSensorIds));
    await this.fetch({ start: startOfDay(state.loaded.start), end: startOfDay(state.loaded.end) });
    this.selectedIds.set(new Set(state.selectedReadingIds));
    this.vnvPopoverOpen.set(state.popover === 'vnv-form');
    // A load-form fixture shows its own dates in the open form (they're shared with the header).
    if (state.popover === 'load-form' && state.loadForm) this.range.set({ start: state.loadForm.start, end: state.loadForm.end });
    // Show a selection where it can be seen: about three weeks around it.
    const times = this.selectedReadings().map((r) => r.timestamp);
    if (times.length) this.setWindow({ start: Math.min(...times) - 18 * DAY_MS, end: Math.max(...times) + 2 * DAY_MS });
  }

  /** Nothing loaded: the first-visit page. */
  clear(): void {
    this.loadToken++;
    this.location.set(null);
    this.loadedSensorIds.set([]);
    this.result.set(null);
    this.loading.set(false);
    this.window.set(null);
    this.hiddenSensorIds.set(new Set());
    this.baselineSensorId.set(null);
    this.oosSensorId.set(null);
    this.clearSelection();
  }

  setSelection(ids: Iterable<string>): void {
    this.selectedIds.set(new Set(ids));
  }

  toggleSelected(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  /** Adds or removes many ids (header and group checkboxes). */
  selectAll(ids: Iterable<string>, on: boolean): void {
    const next = new Set(this.selectedIds());
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
    this.vnvPopoverOpen.set(false);
  }

  toggleGroup(sensorId: string): void {
    const next = new Set(this.collapsedGroups());
    if (next.has(sensorId)) next.delete(sensorId);
    else next.add(sensorId);
    this.collapsedGroups.set(next);
  }

  /** Assigns QI and comment to the selection (mock service, in memory), then clears it. */
  async applyReview(value: { qi: Qi; comment: string }): Promise<void> {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    this.applying.set(true);
    try {
      const updated = await this.service.applyReview({ readingIds: ids, qi: value.qi, comment: value.comment });
      const byId = new Map(updated.map((r) => [r.id, r]));
      this.result.update((res) => (res ? { ...res, readings: res.readings.map((r) => byId.get(r.id) ?? r) } : res));
      this.clearSelection();
    } finally {
      this.applying.set(false);
    }
  }

  toggleSensor(id: string): void {
    const next = new Set(this.hiddenSensorIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.hiddenSensorIds.set(next);
  }

  setWindow(window: XRange): void {
    const x = this.xRange();
    const start = Math.max(x.start, Math.min(window.start, window.end));
    const end = Math.min(x.end, Math.max(window.start, window.end));
    this.window.set(start <= x.start && end >= x.end ? null : { start, end });
  }

  resetWindow(): void {
    this.window.set(null);
  }

  private async fetch(range: DateRangeValue): Promise<void> {
    const location = this.location();
    if (!location) return;
    const token = ++this.loadToken;
    this.range.set(range);
    this.window.set(null);
    this.clearSelection();
    this.loading.set(true);
    try {
      const result = await this.service.load({ sensorIds: [...this.loadedSensorIds()], start: range.start, end: endOfDay(range.end) });
      if (token !== this.loadToken) return; // superseded
      this.result.set(result);
      this.loadedRange.set(range);
      const ids = result.sensors.map((s) => s.id);
      if (!ids.includes(this.baselineSensorId() ?? '')) this.baselineSensorId.set(ids.find((id) => !this.hiddenSensorIds().has(id)) ?? null);
      if (!ids.includes(this.oosSensorId() ?? '')) this.oosSensorId.set(result.outOfService[0]?.sensorId ?? ids[0] ?? null);
    } finally {
      if (token === this.loadToken) this.loading.set(false);
    }
  }
}
