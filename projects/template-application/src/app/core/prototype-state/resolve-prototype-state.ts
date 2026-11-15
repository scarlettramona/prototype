import { analysisState, type ScanQuery } from '../ill/ill.models';
import type { IllDataset } from '../ill/ill-generator';
import { byNewest, matchesScanQuery } from '../ill/ill-query';
import { endOfDay, parseUsDate } from '../mock-data/dates';
import { MOCK_DATA_CONFIG } from '../mock-data/mock-data.config';
import { QI_VALUES, type Qi } from '../qi/qi.models';
import { APP_PATHS } from '../routing/app-paths';
import type { VnvDataset } from '../vnv/vnv-generator';
import { PROTOTYPE_STATES, type IllFocusFixture, type IllLibraryFixture, type PrototypeStateName, type VnvFixture } from './prototype-states';

export interface ResolvedVnvState {
  name: PrototypeStateName;
  module: 'vnv';
  route: string[];
  loaded: null | { locationId: string; sensorIds: string[]; start: number; end: number; showAllData: boolean };
  view: 'chart' | 'table';
  hiddenSensorIds: string[];
  visibleQi: Qi[];
  selectedReadingIds: string[];
  popover: 'load-form' | 'vnv-form' | null;
  loadForm: null | { start: number; end: number; locationId: string | null; search: string; filters: string[] };
}

export interface ResolvedIllLibraryState {
  name: PrototypeStateName;
  module: 'ill';
  screen: 'library';
  route: string[];
  query: ScanQuery;
  loaded: boolean;
  groupByWell: boolean;
  selectedScanIds: string[];
  expandedScanId: string | null;
}

export interface ResolvedIllFocusState {
  name: PrototypeStateName;
  module: 'ill';
  screen: 'focus';
  route: string[];
  wellId: string;
  /** Tab order: oldest first. */
  scanIds: string[];
  /** `all` or a scan id. */
  activeTab: string;
  popover: 'scans-legend' | null;
  zoom: [number, number] | null;
}

export type ResolvedPrototypeState = ResolvedVnvState | ResolvedIllLibraryState | ResolvedIllFocusState;

export interface PrototypeData {
  vnv?: VnvDataset;
  ill?: IllDataset;
}

/** Which datasets a state needs. */
export function stateModule(name: PrototypeStateName): 'vnv' | 'ill' {
  return PROTOTYPE_STATES[name].module;
}

/** Turns a fixture into concrete ids against the generated data. Throws if the data doesn't fit. */
export function resolvePrototypeState(name: PrototypeStateName, data: PrototypeData): ResolvedPrototypeState {
  const fixture = PROTOTYPE_STATES[name];
  if (fixture.module === 'vnv') return resolveVnv(name, fixture, need(data.vnv, 'VNV'));
  return fixture.screen === 'library'
    ? resolveLibrary(name, fixture, need(data.ill, 'ILL'))
    : resolveFocus(name, fixture, need(data.ill, 'ILL'));
}

function resolveVnv(name: PrototypeStateName, f: VnvFixture, ds: VnvDataset): ResolvedVnvState {
  let loaded: ResolvedVnvState['loaded'] = null;
  let hiddenSensorIds: string[] = [];
  let selectedReadingIds: string[] = [];

  if (f.loaded) {
    const location = ds.farm.groups.flatMap((g) => g.locations).find((l) => l.id === f.loaded!.locationId);
    if (!location) throw new Error(`${name}: unknown location ${f.loaded.locationId}`);
    const start = parseUsDate(f.loaded.start);
    const end = endOfDay(parseUsDate(f.loaded.end));
    loaded = { locationId: location.id, sensorIds: [...location.sensorIds], start, end, showAllData: f.loaded.showAllData };
    hiddenSensorIds = f.hiddenSensorCount ? location.sensorIds.slice(-f.hiddenSensorCount) : [];

    if (f.selectionCount) {
      const first = location.sensorIds.find((id) => !hiddenSensorIds.includes(id))!;
      const inRange = ds.readingsFor(first).filter((r) => r.timestamp >= start && r.timestamp <= end);
      selectedReadingIds = inRange.slice(-f.selectionCount).map((r) => r.id);
      if (selectedReadingIds.length !== f.selectionCount) throw new Error(`${name}: not enough readings to select`);
    }
  }

  return {
    name,
    module: 'vnv',
    route: ['/', APP_PATHS.vnv],
    loaded,
    view: f.view,
    hiddenSensorIds,
    visibleQi: f.visibleQi ? [...f.visibleQi] : [...QI_VALUES],
    selectedReadingIds,
    popover: f.popover ?? null,
    loadForm: f.loadForm
      ? {
          start: parseUsDate(f.loadForm.start),
          end: parseUsDate(f.loadForm.end),
          locationId: f.loadForm.locationId ?? null,
          search: f.loadForm.search ?? '',
          filters: [...(f.loadForm.filters ?? [])],
        }
      : null,
  };
}

function resolveLibrary(name: PrototypeStateName, f: IllLibraryFixture, ds: IllDataset): ResolvedIllLibraryState {
  const query: ScanQuery = {
    start: parseUsDate(f.query.start),
    end: parseUsDate(f.query.end),
    wellIds: [],
    qi: f.query.qi,
    analysis: f.query.analysis,
  };
  const results = f.loaded ? [...ds.scans.values()].filter((s) => matchesScanQuery(s, query)).sort(byNewest) : [];
  if (f.loaded && results.length === 0) throw new Error(`${name}: the query matches no scans`);

  let selectedScanIds: string[] = [];
  if (f.selection === 'first-well') {
    const wellId = [...new Set(results.map((s) => s.wellId))].sort()[0];
    selectedScanIds = results.filter((s) => s.wellId === wellId).map((s) => s.id);
  } else if (typeof f.selection === 'number') {
    selectedScanIds = results.slice(0, f.selection).map((s) => s.id);
  }

  let expandedScanId: string | null = null;
  if (f.expandFirstSaved) {
    expandedScanId = results.find((s) => s.analysis.saved)?.id ?? null;
    if (!expandedScanId) throw new Error(`${name}: no saved scan to expand`);
  }

  return {
    name,
    module: 'ill',
    screen: 'library',
    route: ['/', APP_PATHS.ill],
    query,
    loaded: f.loaded,
    groupByWell: f.groupByWell,
    selectedScanIds,
    expandedScanId,
  };
}

function resolveFocus(name: PrototypeStateName, f: IllFocusFixture, ds: IllDataset): ResolvedIllFocusState {
  const wellId = MOCK_DATA_CONFIG.ill.focusWell.id;
  const well = ds.wells.get(wellId);
  if (!well) throw new Error(`${name}: unknown well ${wellId}`);

  let activeTab = 'all';
  if (f.activeTab !== 'all') {
    const scan = well.scanIds.map((id) => ds.scans.get(id)!).find((s) => analysisState(s.analysis) === f.activeTab);
    if (!scan) throw new Error(`${name}: no scan in analysis state ${f.activeTab}`);
    activeTab = scan.id;
  }

  return {
    name,
    module: 'ill',
    screen: 'focus',
    route: ['/', APP_PATHS.ill, APP_PATHS.illFocus, wellId],
    wellId,
    scanIds: [...well.scanIds],
    activeTab,
    popover: f.popover ?? null,
    zoom: f.zoom ? [f.zoom[0], f.zoom[1]] : null,
  };
}

function need<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} data not loaded`);
  return value;
}
