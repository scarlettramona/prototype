import { TestBed } from '@angular/core/testing';
import { analysisState } from '../../core/ill/ill.models';
import { buildTestIllDataset, buildTestVnvDataset } from '../../core/mock-data/testing/load-mock-sources';
import { provideTestMockData } from '../../core/mock-data/testing/provide-test-mock-data';
import { resolvePrototypeState, type ResolvedIllLibraryState } from '../../core/prototype-state/resolve-prototype-state';
import { defaultScanQuery, IllLibraryStore } from './ill-library-store';

describe('IllLibraryStore', () => {
  const data = { vnv: buildTestVnvDataset(), ill: buildTestIllDataset() };
  const state = (name: 'ill-library-empty' | 'ill-library-results' | 'ill-library-grouped' | 'ill-library-saved' | 'ill-library-grouped-expanded') =>
    resolvePrototypeState(name, data) as ResolvedIllLibraryState;
  let store: IllLibraryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestMockData(), IllLibraryStore] });
    store = TestBed.inject(IllLibraryStore);
  });

  it('starts with the form open and nothing loaded', async () => {
    await store.applyState(state('ill-library-empty'));
    expect(store.formOpen()).toBe(true);
    expect(store.loaded()).toBe(false);
    expect(store.query().analysis).toBe('Unsaved');
  });

  it('loads results, collapsing the form, and expands the first row', async () => {
    await store.applyState(state('ill-library-results'));
    expect(store.formOpen()).toBe(false);
    expect(store.results().length).toBeGreaterThan(0);
    // Unsaved filter: none of these scans has results yet (no blue values until Perform analysis).
    expect(store.results().every((s) => !s.analysis.saved && !s.analysis.unsaved)).toBe(true);
    expect(store.expandedId()).toBe(store.results()[0].id);
    expect(store.expandedScan()?.points.length).toBe(513);
    expect(store.presetFor(store.results()[0])?.savedBy).toBeTruthy();
  });

  it('applies the grouped selection and the saved filter', async () => {
    await store.applyState(state('ill-library-grouped'));
    expect(store.grouped()).toBe(true);
    const firstWell = store.groups()[0];
    expect(store.groupCheck(firstWell.scans.map((s) => s.id)).checked).toBe(true);

    await store.applyState(state('ill-library-saved'));
    expect(store.results().every((s) => !!s.analysis.saved)).toBe(true);
    expect(store.selectedIds().size).toBe(2);
    // Perform analysis on the selection: unsaved results over the saved ones (Figma 1:2883).
    expect(store.selected().every((s) => !!s.analysis.unsaved && !!s.analysis.saved)).toBe(true);
  });

  it('filters by search text', async () => {
    await store.loadScans({ ...defaultScanQuery() });
    const well = store.results()[0].wellId;
    store.search.set(well.slice(0, 4));
    expect(store.visible().every((s) => s.wellId.startsWith(well.slice(0, 4)))).toBe(true);
  });

  it('performs then saves analysis on the selection', async () => {
    await store.loadScans({ ...defaultScanQuery(), analysis: 'Saved' });
    const pick = store.results().filter((s) => !s.analysis.unsaved).slice(0, 2);
    store.setSelected(pick.map((s) => s.id), true);
    expect(store.canSave()).toBe(false);

    await store.performAnalysis();
    const ran = store.results().filter((s) => pick.some((p) => p.id === s.id));
    expect(ran.every((s) => analysisState(s.analysis) === 'saved+unsaved')).toBe(true);
    expect(store.canSave()).toBe(true);

    await store.saveAnalysis();
    const done = store.results().filter((s) => pick.some((p) => p.id === s.id));
    expect(done.every((s) => analysisState(s.analysis) === 'saved' && s.analysis.saved!.savedBy === 'Scarlett Reagan')).toBe(true);
  });

  it('saves a row: QI, comments and any unsaved results', async () => {
    await store.loadScans({ ...defaultScanQuery() });
    const row = store.results().find((s) => !s.analysis.saved)!;
    expect(row.analysis.unsaved).toBeUndefined();
    store.setSelected([row.id], true);
    await store.performAnalysis();
    expect(store.results().find((s) => s.id === row.id)!.analysis.unsaved).toBeDefined();
    await store.expand(row.id);
    await store.saveRow(row.id, { qi: 'Suspect', scanComment: 'Sit amet', vnvComment: 'Non pretium' });
    const after = store.results().find((s) => s.id === row.id)!;
    expect(after).toMatchObject({ qi: 'Suspect', scanComment: 'Sit amet', vnvComment: 'Non pretium' });
    expect(after.analysis.unsaved).toBeUndefined();
    expect(after.analysis.saved?.savedBy).toBeTruthy();
    expect(store.expandedScan()?.qi).toBe('Suspect');
  });

  it('resets the form to its defaults', async () => {
    store.query.set({ ...defaultScanQuery(), qi: 'Suspect', wellIds: ['B105 R05 N 20571'] });
    store.reset();
    expect(store.query()).toEqual(defaultScanQuery());
  });
});
