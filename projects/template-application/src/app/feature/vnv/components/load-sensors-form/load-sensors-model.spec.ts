import type { Sensor, VnvFarm, VnvLocation } from '../../../../core/vnv/vnv.models';
import {
  toggleExpanded,
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

/** A component under a tank: `241-AN-TMAC-101-TI` → equipment TMAC, tank 101, type TI. */
function loc(groupId: string, equipment: string | null, tank: string | null, type: string, sensorIds: string[], id?: string): VnvLocation {
  const tankId = tank ? `${groupId}-${tank}` : null;
  return { id: id ?? `${tankId ?? groupId}-${type}`, groupId, tankId, equipment, tank, type, sensorIds };
}

const tmac101 = loc('241-AN-TMAC', 'TMAC', '101', 'TI', ['AN101-TMAC-TI-U1-RJA', 'AN101-TMAC-TI-U3-RJA']);
const tmac102 = loc('241-AN-TMAC', 'TMAC', '102', 'TI', ['AN102-TMAC-TI-U1-RJA', 'AN102-TMAC-TI-U3-RJB']);
const wst101Ti = loc('241-AN-WST', 'WST', '101', 'TI', ['AN101-WST-TI-038']);
const wst101Li = loc('241-AN-WST', 'WST', '101', 'LI', []);
const wsta102 = loc('241-AN-WSTA', 'WSTA', '102', 'TI', ['AN102-WSTA-TI-054']);
const vtaCam = loc('241-AN-VTA', 'VTA', null, 'CAM', []);

const farm: VnvFarm = {
  id: 'AN',
  groups: [
    {
      id: '241-AN-TMAC',
      equipment: 'TMAC',
      tanks: [
        { id: '241-AN-TMAC-101', tank: '101', locationIds: [tmac101.id] },
        { id: '241-AN-TMAC-102', tank: '102', locationIds: [tmac102.id] },
      ],
      locations: [tmac101, tmac102],
    },
    { id: '241-AN-VTA', equipment: 'VTA', tanks: [], locations: [vtaCam] },
    { id: '241-AN-WST', equipment: 'WST', tanks: [{ id: '241-AN-WST-101', tank: '101', locationIds: [wst101Li.id, wst101Ti.id] }], locations: [wst101Li, wst101Ti] },
    { id: '241-AN-WSTA', equipment: 'WSTA', tanks: [{ id: '241-AN-WSTA-102', tank: '102', locationIds: [wsta102.id] }], locations: [wsta102] },
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

describe('Load sensors model', () => {
  it('filters by Equipment, Tank and Component type: OR within a kind, AND across kinds', () => {
    const wst = { kind: 'equipment', value: 'WST' } as const;
    expect(matchesFilters(wst101Ti, [wst])).toBe(true);
    expect(matchesFilters(wsta102, [wst])).toBe(false); // WST is not WSTA
    expect(matchesFilters(tmac101, [{ kind: 'equipment', value: 'TMAC' }, wst])).toBe(true);
    expect(matchesFilters(tmac101, [{ kind: 'type', value: 'TI' }, { kind: 'tank', value: '102' }])).toBe(false);
    expect(matchesFilters(vtaCam, [{ kind: 'tank', value: '101' }])).toBe(false);
    expect(filterOptions(farm)).toEqual({ equipment: ['TMAC', 'VTA', 'WST', 'WSTA'], tank: ['101', '102'], type: ['CAM', 'LI', 'TI'] });
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

  it('builds equipment → tank → component, counting sensors with data on every row', () => {
    const tree = buildTree(farm, sensors, [], '', recent);
    expect(tree.map((g) => [g.id, g.dataCount])).toEqual([
      ['241-AN-TMAC', 3], // U3-RJA on 101 has no data in the range
      ['241-AN-VTA', 0],
      ['241-AN-WST', 1],
      ['241-AN-WSTA', 1],
    ]);
    expect(tree[0].tanks.map((t) => [t.id, t.dataCount, t.locations.map((l) => [l.id, l.dataCount])])).toEqual([
      ['241-AN-TMAC-101', 1, [['241-AN-TMAC-101-TI', 1]]],
      ['241-AN-TMAC-102', 2, [['241-AN-TMAC-102-TI', 2]]],
    ]);
    // A component straight under its group (no tank), listed with no sensors.
    expect(tree[1].locations.map((l) => l.id)).toEqual(['241-AN-VTA-CAM']);
    expect(buildTree(farm, sensors, [{ kind: 'equipment', value: 'WST' }], '', recent).map((g) => g.id)).toEqual(['241-AN-WST']);
    expect(buildTree(farm, sensors, [{ kind: 'type', value: 'LI' }], '', recent)[0].tanks[0].locations.map((l) => l.id)).toEqual(['241-AN-WST-101-LI']);
    expect(buildTree(farm, sensors, [], 'U3', recent).map((g) => g.id)).toEqual(['241-AN-TMAC']);
  });

  it('hides no-data sensors unless Show all, and counts them', () => {
    const hidden = buildList(tmac101, sensors, recent, new Set(), EMPTY_SELECTION, false);
    expect(hidden.rows.map((r) => r.id)).toEqual(['AN101-TMAC-TI-U1-RJA']);
    expect(hidden.noDataCount).toBe(1);
    const shown = buildList(tmac101, sensors, recent, new Set(['AN101-TMAC-TI-U1-RJA']), EMPTY_SELECTION, true);
    expect(shown.rows.map((r) => [r.id, r.noData, r.loaded])).toEqual([
      ['AN101-TMAC-TI-U1-RJA', false, true],
      ['AN101-TMAC-TI-U3-RJA', true, false],
    ]);
  });

  it('select-all covers only selectable rows', () => {
    expect(checkState([true, false])).toEqual({ checked: false, indeterminate: true, disabled: false });
    expect(checkState([])).toEqual({ checked: false, indeterminate: false, disabled: true });
    const sel = { locationId: tmac101.id, ids: new Set(['AN101-TMAC-TI-U1-RJA']) };
    expect(buildList(tmac101, sensors, recent, new Set(), sel, true).selectAll.checked).toBe(true);
  });

  it('groups search results by location and dims groups without data', () => {
    const r = buildSearch(farm, sensors, [], 'U3', recent, EMPTY_SELECTION);
    expect(r.count).toBe(2);
    expect(r.groups.map((g) => [g.tankId, g.locationId, g.disabled])).toEqual([
      ['241-AN-TMAC-101', '241-AN-TMAC-101-TI', true],
      ['241-AN-TMAC-102', '241-AN-TMAC-102-TI', false],
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

  it('keeps one equipment group, and one tank in it, open at a time', () => {
    const farm = {
      id: 'AN',
      groups: [
        { id: 'G1', tanks: [{ id: 'G1-101' }, { id: 'G1-102' }] },
        { id: 'G2', tanks: [{ id: 'G2-101' }] },
      ],
    } as unknown as VnvFarm;
    let open = toggleExpanded(farm, new Set(), 'G1');
    expect([...open]).toEqual(['G1']);
    open = toggleExpanded(farm, open, 'G1-101');
    expect([...open]).toEqual(['G1', 'G1-101']);
    open = toggleExpanded(farm, open, 'G1-102'); // the other tank closes
    expect([...open]).toEqual(['G1', 'G1-102']);
    open = toggleExpanded(farm, open, 'G2'); // the other group (and its tank) closes
    expect([...open]).toEqual(['G2']);
    expect([...toggleExpanded(farm, open, 'G2')]).toEqual([]);
    expect([...toggleExpanded(farm, new Set(['G1', 'G1-101']), 'G1-101')]).toEqual(['G1']);
  });
});
