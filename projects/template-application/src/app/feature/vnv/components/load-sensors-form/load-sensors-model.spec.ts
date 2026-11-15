import type { Sensor, VnvFarm } from '../../../../core/vnv/vnv.models';
import {
  buildList,
  buildSearch,
  buildTree,
  checkState,
  EMPTY_SELECTION,
  filterOptions,
  hasData,
  highlight,
  matchesFilters,
  setSensors,
  splitName,
  toggleSensor,
} from './load-sensors-model';

const day = (m: number, d: number, y = 2026) => new Date(y, m - 1, d).getTime();

const farm: VnvFarm = {
  id: 'AN',
  groups: [
    {
      id: '241-AN-TMAC',
      locations: [
        { id: '241-AN-TMAC-101-TI', groupId: '241-AN-TMAC', sensorIds: ['AN101-TMAC-TI-U1-RJA', 'AN101-TMAC-TI-U3-RJA'] },
        { id: '241-AN-TMAC-102-TI', groupId: '241-AN-TMAC', sensorIds: ['AN102-TMAC-TI-U1-RJA', 'AN102-TMAC-TI-U3-RJB'] },
      ],
    },
    { id: '241-AN-WST', locations: [{ id: '241-AN-WST-101-TI', groupId: '241-AN-WST', sensorIds: ['AN101-WST-TI-038'] }] },
    { id: '241-AN-WSTA', locations: [{ id: '241-AN-WSTA-102-TI', groupId: '241-AN-WSTA', sensorIds: ['AN102-WSTA-TI-054'] }] },
  ],
};

function sensor(id: string, locationId: string, dataEnd = day(11, 12)): Sensor {
  return { id, locationId, elevationIn: 0, units: '°F', colorIndex: 0, dataStart: day(1, 1, 2025), dataEnd, real: false };
}

const sensors = new Map(
  [
    sensor('AN101-TMAC-TI-U1-RJA', '241-AN-TMAC-101-TI'),
    sensor('AN101-TMAC-TI-U3-RJA', '241-AN-TMAC-101-TI', day(3, 31, 2025)), // no data after 03/31/2025
    sensor('AN102-TMAC-TI-U1-RJA', '241-AN-TMAC-102-TI'),
    sensor('AN102-TMAC-TI-U3-RJB', '241-AN-TMAC-102-TI'),
    sensor('AN101-WST-TI-038', '241-AN-WST-101-TI'),
    sensor('AN102-WSTA-TI-054', '241-AN-WSTA-102-TI'),
  ].map((s) => [s.id, s]),
);

const recent = { start: day(7, 19), end: day(10, 19) };
const tmac101 = farm.groups[0].locations[0];

describe('Load sensors model', () => {
  it('filters by whole name tokens, every chip must match (WST is not WSTA)', () => {
    expect(matchesFilters('241-AN-WST-101-TI', 'AN101-WST-TI-038', ['WST'])).toBe(true);
    expect(matchesFilters('241-AN-WSTA-102-TI', 'AN102-WSTA-TI-054', ['WST'])).toBe(false);
    expect(matchesFilters('241-AN-TMAC-101-TI', 'AN101-TMAC-TI-U1-RJA', ['TI', 'TMAC'])).toBe(true);
    expect(matchesFilters('241-AN-TMAC-101-TI', 'AN101-TMAC-TI-U1-RJA', ['TI', 'WST'])).toBe(false);
    expect(filterOptions(farm)).toEqual(['TI', 'TMAC', 'WST', 'WSTA']);
  });

  it('splits names into a plain stem and a bold suffix', () => {
    expect(splitName('AN103-TMAC-TI-U1-RJA')).toEqual({ stem: 'AN103-TMAC-TI-', suffix: 'U1-RJA' });
    expect(splitName('AN102-WSTA-TI-054')).toEqual({ stem: 'AN102-WSTA-TI-', suffix: '054' });
  });

  it('highlights every case-insensitive match', () => {
    expect(highlight('AN101-TMAC-TI-U3-RJA', 'u3')).toEqual([
      { text: 'AN101-TMAC-TI-', match: false },
      { text: 'U3', match: true },
      { text: '-RJA', match: false },
    ]);
    expect(highlight('ABC', '')).toEqual([{ text: 'ABC', match: false }]);
  });

  it('knows which sensors have data in a range', () => {
    expect(hasData(sensors.get('AN101-TMAC-TI-U3-RJA')!, recent)).toBe(false);
    expect(hasData(sensors.get('AN101-TMAC-TI-U3-RJA')!, { start: day(1, 1, 2025), end: day(11, 12) })).toBe(true);
  });

  it('builds the tree from filters and search, with selected counts', () => {
    const sel = { locationId: tmac101.id, ids: new Set(['AN101-TMAC-TI-U1-RJA']) };
    const tree = buildTree(farm, [], '', sel);
    expect(tree.map((g) => g.id)).toEqual(['241-AN-TMAC', '241-AN-WST', '241-AN-WSTA']);
    expect(tree[0].locations[0].selectedCount).toBe(1);
    expect(buildTree(farm, ['WST'], '', EMPTY_SELECTION).map((g) => g.id)).toEqual(['241-AN-WST']);
    expect(buildTree(farm, [], 'U3', EMPTY_SELECTION).map((g) => g.id)).toEqual(['241-AN-TMAC']);
  });

  it('hides no-data sensors unless Show all, and counts them', () => {
    const hidden = buildList(tmac101, sensors, [], recent, new Set(), EMPTY_SELECTION, false);
    expect(hidden.rows.map((r) => r.id)).toEqual(['AN101-TMAC-TI-U1-RJA']);
    expect(hidden.noDataCount).toBe(1);
    const shown = buildList(tmac101, sensors, [], recent, new Set(['AN101-TMAC-TI-U1-RJA']), EMPTY_SELECTION, true);
    expect(shown.rows.map((r) => [r.id, r.noData, r.loaded])).toEqual([
      ['AN101-TMAC-TI-U1-RJA', false, true],
      ['AN101-TMAC-TI-U3-RJA', true, false],
    ]);
  });

  it('select-all covers only selectable rows', () => {
    expect(checkState([true, false])).toEqual({ checked: false, indeterminate: true, disabled: false });
    expect(checkState([])).toEqual({ checked: false, indeterminate: false, disabled: true });
    const sel = { locationId: tmac101.id, ids: new Set(['AN101-TMAC-TI-U1-RJA']) };
    expect(buildList(tmac101, sensors, [], recent, new Set(), sel, true).selectAll.checked).toBe(true);
  });

  it('groups search results by location and dims groups without data', () => {
    const r = buildSearch(farm, sensors, [], 'U3', recent, EMPTY_SELECTION);
    expect(r.count).toBe(2);
    expect(r.groups.map((g) => [g.locationId, g.disabled])).toEqual([
      ['241-AN-TMAC-101-TI', true],
      ['241-AN-TMAC-102-TI', false],
    ]);
  });

  it('keeps the selection to one component at a time', () => {
    let sel = toggleSensor(EMPTY_SELECTION, '241-AN-TMAC-101-TI', 'AN101-TMAC-TI-U1-RJA');
    sel = toggleSensor(sel, '241-AN-TMAC-101-TI', 'AN101-TMAC-TI-U3-RJA');
    expect([...sel.ids]).toHaveLength(2);
    sel = toggleSensor(sel, '241-AN-TMAC-102-TI', 'AN102-TMAC-TI-U1-RJA');
    expect(sel).toEqual({ locationId: '241-AN-TMAC-102-TI', ids: new Set(['AN102-TMAC-TI-U1-RJA']) });
    sel = setSensors(sel, '241-AN-TMAC-102-TI', ['AN102-TMAC-TI-U1-RJA'], false);
    expect(sel).toBe(EMPTY_SELECTION);
  });
});
