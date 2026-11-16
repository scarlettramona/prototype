import { ChangeDetectionStrategy, Component, computed, effect, input, model, output, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { parseUsDate, startOfDay } from '../../../../core/mock-data/dates';
import { MOCK_DATA_CONFIG } from '../../../../core/mock-data/mock-data.config';
import type { Sensor, VnvFarm } from '../../../../core/vnv/vnv.models';
import type { DateRangeValue } from '../../../../ui/components/date-range-field/date-range-field.component';
import {
  buildList,
  buildSearch,
  buildTree,
  EMPTY_SELECTION,
  filterOptions,
  setSensors,
  toggleSensor,
  type PickerSelection,
} from './load-sensors-model';

export interface LoadSensorsInit {
  locationId: string | null;
  /** Pre-selected sensors (the loaded ones, in the popover). */
  selectedIds: readonly string[];
  search: string;
  filters: readonly string[];
  showNoData: boolean;
}

export interface LoadSensorsRequest {
  locationId: string;
  sensorIds: string[];
  range: DateRangeValue;
}

let nextId = 0;

/** "Set to default": the last 3 months of data. */
export function defaultLoadRange(): DateRangeValue {
  const end = parseUsDate(MOCK_DATA_CONFIG.vnv.rangeEnd);
  const d = new Date(end);
  d.setMonth(d.getMonth() - 3);
  return { start: d.getTime(), end };
}

/**
 * Load sensors (Figma sensor-query 1:11708 … 1:12068): Farm, dates, search,
 * filter chips, then a location tree and the sensors of the chosen location,
 * and the footer with the selection summary and Load sensors.
 * - `page`: first visit, the form is the page; the footer sticks to the window.
 * - `popover`: from Load data; the columns scroll inside and the footer stays put.
 */
@Component({
  selector: 'app-load-sensors-form',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './load-sensors-form.component.html',
  styleUrl: './load-sensors-form.component.scss',
  host: { class: 'app-filled-fields', '[class.popover]': "mode() === 'popover'", '[class.page]': "mode() === 'page'", '[class.searching]': 'searching()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadSensorsFormComponent {
  protected readonly fieldId = `load-sensors-${nextId++}`;
  readonly mode = input<'page' | 'popover'>('page');
  readonly farm = input.required<VnvFarm>();
  readonly sensors = input.required<readonly Sensor[]>();
  readonly loadedSensorIds = input<readonly string[]>([]);
  readonly initial = input<LoadSensorsInit | null>(null);
  /** Shared with the page header's date range. */
  readonly range = model.required<DateRangeValue>();

  readonly load = output<LoadSensorsRequest>();
  readonly cancel = output<void>();

  protected readonly search = signal('');
  protected readonly filters = signal<string[]>([]);
  protected readonly selection = signal<PickerSelection>(EMPTY_SELECTION);
  protected readonly activeLocationId = signal<string | null>(null);
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly showNoData = signal(false);

  private readonly sensorsById = computed(() => new Map(this.sensors().map((s) => [s.id, s])));
  private readonly loaded = computed(() => new Set(this.loadedSensorIds()));
  private readonly locations = computed(() => new Map(this.farm().groups.flatMap((g) => g.locations.map((l) => [l.id, l] as const))));

  protected readonly filterMenu = computed(() => filterOptions(this.farm()).filter((t) => !this.filters().includes(t)));
  protected readonly searching = computed(() => this.search().trim() !== '');
  protected readonly tree = computed(() => buildTree(this.farm(), this.filters(), this.search(), this.selection()));
  protected readonly list = computed(() => {
    const loc = this.locations().get(this.activeLocationId() ?? '');
    return loc ? buildList(loc, this.sensorsById(), this.filters(), this.range(), this.loaded(), this.selection(), this.showNoData()) : null;
  });
  protected readonly results = computed(() =>
    this.searching() ? buildSearch(this.farm(), this.sensorsById(), this.filters(), this.search(), this.range(), this.selection()) : null,
  );
  protected readonly summary = computed(() => {
    const s = this.selection();
    return s.locationId ? `${s.locationId} | ${s.ids.size} selected` : '';
  });

  protected readonly startDate = computed(() => new Date(this.range().start));
  protected readonly endDate = computed(() => new Date(this.range().end));

  constructor() {
    // (Re)initialise whenever the host passes new initial values (opening the popover, a ?state= fixture).
    effect(() => {
      const init = this.initial();
      untracked(() => this.reset(init));
    });
  }

  /** Back to `init`, or to an empty form (first visit Cancel). */
  reset(init: LoadSensorsInit | null = null): void {
    this.search.set(init?.search ?? '');
    this.filters.set([...(init?.filters ?? [])]);
    this.showNoData.set(init?.showNoData ?? false);
    const locationId = init?.locationId ?? null;
    const ids = init?.selectedIds ?? [];
    this.selection.set(locationId && ids.length ? { locationId, ids: new Set(ids) } : EMPTY_SELECTION);
    this.activeLocationId.set(locationId);
    const loc = locationId ? this.locations().get(locationId) : undefined;
    this.expanded.set(new Set(loc ? [loc.groupId] : []));
  }

  protected isExpanded(groupId: string): boolean {
    return this.searching() || this.expanded().has(groupId);
  }

  protected toggleGroup(groupId: string): void {
    const next = new Set(this.expanded());
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    this.expanded.set(next);
  }

  protected openLocation(locationId: string): void {
    this.activeLocationId.set(locationId);
  }

  protected toggle(locationId: string, id: string): void {
    this.selection.set(toggleSensor(this.selection(), locationId, id));
  }

  protected setAll(locationId: string, ids: readonly string[], on: boolean): void {
    this.selection.set(setSensors(this.selection(), locationId, ids, on));
  }

  /** "Show in tree": leave search and open that location. */
  protected showInTree(groupId: string, locationId: string): void {
    this.search.set('');
    this.activeLocationId.set(locationId);
    this.expanded.set(new Set([...this.expanded(), groupId]));
  }

  protected addFilter(token: string): void {
    this.filters.set([...this.filters(), token]);
  }

  protected removeFilter(token: string): void {
    this.filters.set(this.filters().filter((t) => t !== token));
  }

  protected setStart(d: Date | null): void {
    if (d) this.range.set({ start: startOfDay(d.getTime()), end: Math.max(this.range().end, startOfDay(d.getTime())) });
  }

  protected setEnd(d: Date | null): void {
    if (d) this.range.set({ start: Math.min(this.range().start, startOfDay(d.getTime())), end: startOfDay(d.getTime()) });
  }

  protected setDefaultDates(): void {
    this.range.set(defaultLoadRange());
  }

  protected submit(): void {
    const s = this.selection();
    if (!s.locationId || s.ids.size === 0) return;
    // Keep the location's sensor order.
    const order = this.locations().get(s.locationId)?.sensorIds ?? [];
    this.load.emit({ locationId: s.locationId, sensorIds: order.filter((id) => s.ids.has(id)), range: this.range() });
  }

  protected onCancel(): void {
    if (this.mode() === 'page') {
      this.reset(null);
      this.range.set(defaultLoadRange());
    }
    this.cancel.emit();
  }

}
