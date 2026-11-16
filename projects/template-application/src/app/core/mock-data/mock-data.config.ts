import type { StoredAnalysisState } from '../ill/ill.models';

/** AN tanks 101–107. */
const AN_TANKS = ['101', '102', '103', '104', '105', '106', '107'] as const;

/** One tank node per AN tank, with the given component types (`241-AN-WST-101-TI`). */
function anTanks(group: string, types: readonly string[]) {
  return AN_TANKS.map((tank) => ({ id: `${group}-${tank}`, tank, components: types.map((t) => `${group}-${tank}-${t}`) }));
}

/**
 * Every knob for the mock data, in one place. The generators read only this
 * (plus the real CSVs), so the same config always produces the same data.
 */
export const MOCK_DATA_CONFIG = {
  seed: 20261115,

  /** Mock service latency, ms. */
  latencyMs: { min: 300, max: 800 },

  /** Recorded as reviewer / saver when the user applies changes. */
  currentUser: 'Scarlett Reagan',

  /** Placeholder people and comments, taken from the Figma frames. */
  people: [
    'Joyann Newdick',
    'Henka Branigan',
    'Philip Rennie',
    'Tessie Cabel',
    'Bernadene Fri',
    'Kinsley Sparkes',
    'Arch Bence',
    'Simeon Scrange',
    'Abram Isaacs',
    'Blythe Autie',
    'Boniface Moorman',
    'Morgan Furney',
    'Stephie Kryszkiecicz',
    'Sebastiano Reap',
    'Scarlett Reagan',
  ],
  comments: [
    'Dapibus at diam nam tristique',
    'Justo lacinia eget tincidunt eget tempus vel pede morbi porttitor lorem id',
    'Non pretium',
    'In hac habitasse platea',
    'Morbi non quam nec dui luctus rutrum nulla tellus in sagittis',
    'Vestibulum sit amet cursus id turpis integer',
    'A ipsum integer',
    'Non sodales sed tincidunt eu felis',
    'Sit amet',
  ],

  vnv: {
    farm: 'AN',
    /** Generated data covers this range (M/D/YYYY). */
    rangeStart: '1/1/2025',
    rangeEnd: '11/12/2026',
    readingsPerDay: { min: 1, max: 4 },
    /** Generated sensors sit this far (±, °F) from the real series they derive from. */
    offsetF: { min: 1, max: 3 },
    /** Peak of the yearly temperature swing, °F (warmest mid-August). */
    seasonalAmplitudeF: 1.4,
    /** Exports are quantised to 0.1 °C (≈0.18 °F) and stored as float32. */
    quantumC: 0.1,
    /** Readings in the last N days are Unreviewed. */
    unreviewedDays: 14,
    /** QI mix for reviewed (older) readings. */
    reviewedQiMix: { Good: 0.84, Suspect: 0.12, Transcribed: 0.04 },
    /** Share of reviewed readings that carry a comment. */
    commentRate: 0.25,

    /** The location the real sensors belong to; filled up to `sensorCount`. */
    mainLocation: {
      groupId: '241-AN-WSTA',
      id: '241-AN-WSTA-102-TI',
      sensorPrefix: 'AN102-WSTA-TI-',
      sensorCount: 40,
      firstNumber: 41,
    },

    /**
     * The AN farm tree (Scarlett, 2026-11-16): equipment group → tank → component.
     * A component's type is its last id segment without leading digits (01C → C).
     * Only TI components get sensors; the others are listed with none.
     */
    farmTree: [
      { id: '241-AN-Other', equipment: null, tanks: [{ id: '241-AN-271', tank: '271', components: ['241-AN-271-LI', '241-AN-271-PR'] }], components: [] },
      { id: '241-AN-TMAC', equipment: 'TMAC', tanks: anTanks('241-AN-TMAC', ['TI']), components: [] },
      { id: '241-AN-VTA', equipment: 'VTA', tanks: [], components: ['241-AN-VTA-CAM'] },
      { id: '241-AN-VTP', equipment: 'VTP', tanks: [], components: ['241-AN-VTP-CAM', '241-AN-VTP-PDI'] },
      { id: '241-AN-WST', equipment: 'WST', tanks: anTanks('241-AN-WST', ['LI', 'TI']), components: [] },
      {
        id: '241-AN-WSTA',
        equipment: 'WSTA',
        tanks: AN_TANKS.map((tank) => ({
          id: `241-AN-WSTA-${tank}`,
          tank,
          components: [`241-AN-${tank.slice(1)}C`, `241-AN-WSTA-${tank}-LDI`, `241-AN-WSTA-${tank}-TI`],
        })),
        components: [],
      },
    ],
    /** Sensors per TI component, by equipment (the main location has its own 40). */
    tiSensorsPerComponent: 6,
    /** Share of sensors outside the main location whose data stops early ("no data" in recent ranges). */
    noDataRate: 0.2,
    /** Day their data stops. */
    noDataEnd: '3/31/2025',

    baselineStartDate: '4/19/2013',
    outOfService: [
      { sensorId: 'AN102-WSTA-TI-060', start: '3/3/2026', end: '3/17/2026' },
      { sensorId: 'AN102-WSTA-TI-077', start: '8/4/2025', end: '8/11/2025' },
      { sensorId: 'AN102-WSTA-TI-045', start: '9/21/2026', end: '9/28/2026' },
      { sensorId: 'AN103-TMAC-TI-U2-RJA', start: '9/14/2026', end: '9/30/2026' },
    ],
  },

  ill: {
    /** The riser the focus-view frames show. Gets the analysis-state spread. */
    focusWell: {
      id: 'B105 R05 N 20571',
      /** One entry per scan, oldest first. */
      analysisStates: ['saved', 'saved', 'none', 'none', 'saved', 'saved', 'saved', 'saved'] satisfies readonly StoredAnalysisState[],
    },
    /** Other wells and how many scans each has. The real scan's well gets extra generated scans. */
    wells: [
      { id: 'B108 R06 N 200871', scans: 3 },
      { id: 'B109 R07A N 200970', scans: 2 },
      { id: 'BX111 R05 N 211168', scans: 3 },
      { id: 'BY102 E01 N 220263', scans: 4 },
      { id: 'BY103 R10A N 220366', scans: 2 },
      { id: 'BY104 R10C N 220466', scans: 2 },
      { id: 'BY105 R10A N 220566', scans: 2 },
      { id: 'BY109 R12B N 220960', scans: 3 },
      { id: 'S101 R02 N 400166', scans: 6 },
    ],
    realWellExtraScans: 2,
    /** Scan dates fall in this range (M/D/YYYY)… */
    scanRangeStart: '1/1/2023',
    scanRangeEnd: '11/12/2026',
    /** …with this share in the library's default range, so it shows results. */
    recentRangeStart: '7/19/2026',
    recentRangeEnd: '10/19/2026',
    recentShare: 0.5,
    /** Analysis-state mix for wells other than the focus well. */
    analysisMix: { saved: 0.75, none: 0.25 } satisfies Record<StoredAnalysisState, number>,
    /** The Default parameter preset's saved on / by (Figma 1:9514). */
    defaultPreset: { savedAt: '10/16/2026', savedBy: 'Scarlett Reagan' },
    qiMix: { Good: 0.7, Suspect: 0.15, 'Not set': 0.15 },
    /** Derived profiles: counts scale ±, count offset ±, drop/rise shift (in) ±, noise (× √counts). */
    countGain: 0.04,
    countOffset: 25,
    depthShiftIn: { min: 1, max: 2 },
    noise: 1.6,
  },
} as const;

export type MockDataConfig = typeof MOCK_DATA_CONFIG;
