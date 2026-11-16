import { endOfDay } from '../../../../core/mock-data/dates';
import { checkState, type CheckState } from '../../../../core/selection/check-state';
import type { DateRange, Sensor, VnvFarm, VnvLocation } from '../../../../core/vnv/vnv.models';

export { checkState, type CheckState };

/**
 * Pure logic for the Load sensors form (Figma 1:11708…1:12068): Equipment /
 * Tank / Component type filters, search, sensors-with-data counts, no-data, and
 * the one-component-at-a-time selection.
 */

/** The selection: sensors of one location (one component at a time). */
export interface PickerSelection {
  locationId: string | null;
  ids: ReadonlySet<string>;
}

export const EMPTY_SELECTION: PickerSelection = { locationId: null, ids: new Set() };

// ── Filters ─────────────────────────────────────────────────────────────────

export type FilterKind = 'equipment' | 'tank' | 'type';

/** One filter chip, e.g. Equipment WST or Component type TI. */
export interface PickerFilter {
  kind: FilterKind;
  value: string;
}

/** The Add filters menu's submenus, in order. */
export const FILTER_KINDS: readonly { kind: FilterKind; label: string }[] = [
  { kind: 'equipment', label: 'Equipment' },
  { kind: 'tank', label: 'Tank' },
  { kind: 'type', label: 'Component type' },
];

/** Each submenu's values, from the components in the farm (sorted). */
export function filterOptions(farm: VnvFarm): Record<FilterKind, string[]> {
  const sets: Record<FilterKind, Set<string>> = { equipment: new Set(), tank: new Set(), type: new Set() };
  for (const l of farm.groups.flatMap((g) => g.locations)) {
    if (l.equipment) sets.equipment.add(l.equipment);
    if (l.tank) sets.tank.add(l.tank);
    sets.type.add(l.type);
  }
  const sorted = (s: Set<string>) => [...s].sort();
  return { equipment: sorted(sets.equipment), tank: sorted(sets.tank), type: sorted(sets.type) };
}

export function sameFilter(a: PickerFilter, b: PickerFilter): boolean {
  return a.kind === b.kind && a.value === b.value;
}

/** A component passes when, for every kind with chips, its value is one of them (OR within a kind, AND across kinds). */
export function matchesFilters(location: VnvLocation, filters: readonly PickerFilter[]): boolean {
  return FILTER_KINDS.every(({ kind }) => {
    const values = filters.filter((f) => f.kind === kind).map((f) => f.value);
    return values.length === 0 || values.includes(location[kind] ?? '');
  });
}

export function matchesSearch(sensorId: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === '' || sensorId.toLowerCase().includes(q);
}

/** Does the sensor have readings in the range (whole days)? */
export function hasData(sensor: Pick<Sensor, 'dataStart' | 'dataEnd'>, range: DateRange): boolean {
  return sensor.dataStart <= endOfDay(range.end) && sensor.dataEnd >= range.start;
}

/**
 * The sensor name as Figma shows it: the stem plain, the distinguishing suffix
 * bold. `AN103-TMAC-TI-U1-RJA` → `AN103-TMAC-TI-` + **`U1-RJA`**.
 */
export function splitName(sensorId: string): { stem: string; suffix: string } {
  const parts = sensorId.split('-');
  if (parts.length <= 3) return { stem: '', suffix: sensorId };
  return { stem: parts.slice(0, 3).join('-') + '-', suffix: parts.slice(3).join('-') };
}

export interface TextSegment {
  text: string;
  match: boolean;
}

/** Splits text into segments, marking case-insensitive matches of `query`. */
export function highlight(text: string, query: string): TextSegment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const out: TextSegment[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, i)) {
    if (at > i) out.push({ text: text.slice(i, at), match: false });
    out.push({ text: text.slice(at, at + q.length), match: true });
    i = at + q.length;
  }
  if (i < text.length) out.push({ text: text.slice(i), match: false });
  return out;
}

// ── Tree ────────────────────────────────────────────────────────────────────

/** Every row shows how many of its sensors have data in the date range, on the right. */
export interface TreeLocationVm {
  id: string;
  groupId: string;
  tankId: string | null;
  dataCount: number;
}

export interface TreeTankVm {
  id: string;
  dataCount: number;
  locations: TreeLocationVm[];
}

export interface TreeGroupVm {
  id: string;
  dataCount: number;
  tanks: TreeTankVm[];
  /** Components directly under the group (no tank). */
  locations: TreeLocationVm[];
}

/**
 * Equipment → tank → component, keeping the components that pass the filters
 * (and, while searching, have a matching sensor). Empty tanks and groups drop out.
 */
export function buildTree(
  farm: VnvFarm,
  sensorsById: ReadonlyMap<string, Sensor>,
  filters: readonly PickerFilter[],
  query: string,
  range: DateRange,
): TreeGroupVm[] {
  const node = (l: VnvLocation): TreeLocationVm | null => {
    if (!matchesFilters(l, filters)) return null;
    const ids = l.sensorIds.filter((id) => matchesSearch(id, query));
    if (query.trim() && ids.length === 0) return null;
    const dataCount = ids.filter((id) => {
      const s = sensorsById.get(id);
      return !!s && hasData(s, range);
    }).length;
    return { id: l.id, groupId: l.groupId, tankId: l.tankId, dataCount };
  };
  const sum = (rows: readonly { dataCount: number }[]) => rows.reduce((n, r) => n + r.dataCount, 0);

  return farm.groups
    .map((g) => {
      const byId = new Map(g.locations.map((l) => [l.id, l]));
      const tanks = g.tanks
        .map((t) => {
          const locations = t.locationIds.flatMap((id) => {
            const vm = byId.has(id) ? node(byId.get(id)!) : null;
            return vm ? [vm] : [];
          });
          return { id: t.id, dataCount: sum(locations), locations };
        })
        .filter((t) => t.locations.length > 0);
      const locations = g.locations.filter((l) => l.tankId === null).flatMap((l) => {
        const vm = node(l);
        return vm ? [vm] : [];
      });
      return { id: g.id, dataCount: sum(tanks) + sum(locations), tanks, locations };
    })
    .filter((g) => g.tanks.length > 0 || g.locations.length > 0);
}

// ── List (browse) ───────────────────────────────────────────────────────────

export interface SensorRowVm {
  id: string;
  stem: string;
  suffix: string;
  loaded: boolean;
  noData: boolean;
  checked: boolean;
}

export interface SensorListVm {
  location: VnvLocation;
  rows: SensorRowVm[];
  /** Sensors (after filters) with no readings in the range. */
  noDataCount: number;
  selectAll: CheckState;
}

/** The right column for one location. No-data rows are hidden unless `showNoData`. */
export function buildList(
  location: VnvLocation,
  sensorsById: ReadonlyMap<string, Sensor>,
  range: DateRange,
  loaded: ReadonlySet<string>,
  selection: PickerSelection,
  showNoData: boolean,
): SensorListVm {
  const ids = location.sensorIds;
  const mine = selection.locationId === location.id ? selection.ids : new Set<string>();
  const all = ids.map((id) => {
    const s = sensorsById.get(id);
    const { stem, suffix } = splitName(id);
    return { id, stem, suffix, loaded: loaded.has(id), noData: !s || !hasData(s, range), checked: mine.has(id) };
  });
  const noDataCount = all.filter((r) => r.noData).length;
  const rows = showNoData ? all : all.filter((r) => !r.noData);
  return { location, rows, noDataCount, selectAll: checkState(rows.filter((r) => !r.noData).map((r) => r.checked)) };
}

// ── Search ──────────────────────────────────────────────────────────────────

export interface SearchRowVm {
  id: string;
  segments: TextSegment[];
  noData: boolean;
  checked: boolean;
}

export interface SearchGroupVm {
  groupId: string;
  tankId: string | null;
  locationId: string;
  rows: SearchRowVm[];
  check: CheckState;
  /** Every match here has no data in the range: the group is dimmed. */
  disabled: boolean;
}

export interface SearchVm {
  query: string;
  count: number;
  groups: SearchGroupVm[];
}

/** The right column while searching: matches grouped by component (Figma 1:12068). */
export function buildSearch(
  farm: VnvFarm,
  sensorsById: ReadonlyMap<string, Sensor>,
  filters: readonly PickerFilter[],
  query: string,
  range: DateRange,
  selection: PickerSelection,
): SearchVm {
  const groups: SearchGroupVm[] = [];
  for (const g of farm.groups) {
    for (const l of g.locations) {
      if (!matchesFilters(l, filters)) continue;
      const ids = l.sensorIds.filter((id) => matchesSearch(id, query));
      if (ids.length === 0) continue;
      const mine = selection.locationId === l.id ? selection.ids : new Set<string>();
      const rows = ids.map((id) => {
        const s = sensorsById.get(id);
        return { id, segments: highlight(id, query), noData: !s || !hasData(s, range), checked: mine.has(id) };
      });
      const selectable = rows.filter((r) => !r.noData);
      groups.push({
        groupId: g.id,
        tankId: l.tankId,
        locationId: l.id,
        rows,
        check: checkState(selectable.map((r) => r.checked)),
        disabled: selectable.length === 0,
      });
    }
  }
  return { query: query.trim(), count: groups.reduce((n, g) => n + g.rows.length, 0), groups };
}

// ── Selection rule: one component at a time ─────────────────────────────────

export function toggleSensor(sel: PickerSelection, locationId: string, id: string): PickerSelection {
  const ids = new Set(sel.locationId === locationId ? sel.ids : []);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return ids.size ? { locationId, ids } : EMPTY_SELECTION;
}

export function setSensors(sel: PickerSelection, locationId: string, ids: readonly string[], on: boolean): PickerSelection {
  const next = new Set(sel.locationId === locationId ? sel.ids : []);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  return next.size ? { locationId, ids: next } : EMPTY_SELECTION;
}
