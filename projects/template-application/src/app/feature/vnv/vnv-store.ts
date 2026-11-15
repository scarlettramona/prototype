import { computed, inject, Injectable, signal } from '@angular/core';
import { QI_VALUES, type Qi } from '../../core/qi/qi.models';
import type { ResolvedVnvState } from '../../core/prototype-state/resolve-prototype-state';
import { VnvMockService } from '../../core/vnv/vnv-mock.service';
import type { VnvLoadResult, VnvLocation } from '../../core/vnv/vnv.models';
import type { DateRangeValue } from '../../ui/components/date-range-field/date-range-field.component';
import type { ContentView } from '../../ui/components/view-switcher/view-switcher.component';
import { endOfDay, startOfDay } from '../../core/mock-data/dates';
import { groupBySensor, type SensorSeries, type XRange } from './components/vnv-chart/vnv-chart-options';

/**
 * VNV screen state. Provided by `VnvPageComponent`, so it lives as long as the
 * page. Chart and table (Phase 4) read the same data from here.
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

  readonly headerSummary = computed(() => {
    const l = this.location();
    return l ? { name: l.id, sensorCount: l.sensorIds.length } : null;
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

  /** Loads a location's sensors for a range (replaces what's loaded). */
  async load(locationId: string, range: DateRangeValue): Promise<void> {
    const farm = await this.service.getFarm();
    const location = farm.groups.flatMap((g) => g.locations).find((l) => l.id === locationId) ?? null;
    if (!location) throw new Error(`Unknown location: ${locationId}`);
    this.location.set(location);
    this.hiddenSensorIds.set(new Set());
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
    if (!state.loaded) {
      this.clear();
      return;
    }
    this.showAllData.set(state.loaded.showAllData);
    const farm = await this.service.getFarm();
    const location = farm.groups.flatMap((g) => g.locations).find((l) => l.id === state.loaded!.locationId) ?? null;
    this.location.set(location);
    this.hiddenSensorIds.set(new Set(state.hiddenSensorIds));
    await this.fetch({ start: startOfDay(state.loaded.start), end: startOfDay(state.loaded.end) });
  }

  /** Nothing loaded: the first-visit page. */
  clear(): void {
    this.loadToken++;
    this.location.set(null);
    this.result.set(null);
    this.loading.set(false);
    this.window.set(null);
    this.hiddenSensorIds.set(new Set());
    this.baselineSensorId.set(null);
    this.oosSensorId.set(null);
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
    this.loading.set(true);
    try {
      const result = await this.service.load({ sensorIds: location.sensorIds, start: range.start, end: endOfDay(range.end) });
      if (token !== this.loadToken) return; // superseded
      this.result.set(result);
      const ids = result.sensors.map((s) => s.id);
      if (!ids.includes(this.baselineSensorId() ?? '')) this.baselineSensorId.set(ids.find((id) => !this.hiddenSensorIds().has(id)) ?? null);
      if (!ids.includes(this.oosSensorId() ?? '')) this.oosSensorId.set(result.outOfService[0]?.sensorId ?? ids[0] ?? null);
    } finally {
      if (token === this.loadToken) this.loading.set(false);
    }
  }
}
