import type { Provider } from '@angular/core';
import { MOCK_LATENCY } from '../latency';
import { MockDataService } from '../mock-data.service';
import { MOCK_DATA_ANCHOR, MOCK_TODAY } from '../today';
import { buildTestIllDataset, buildTestVnvDataset } from './load-mock-sources';

/** Test providers: datasets built from the CSVs on disk, no latency, today pinned to the data's anchor date. Fresh per call. */
export function provideTestMockData(): Provider[] {
  const vnv = buildTestVnvDataset();
  const ill = buildTestIllDataset();
  return [
    { provide: MOCK_LATENCY, useValue: () => 0 },
    { provide: MOCK_TODAY, useValue: MOCK_DATA_ANCHOR },
    {
      provide: MockDataService,
      useValue: { vnvDataset: () => Promise.resolve(vnv), illDataset: () => Promise.resolve(ill) } satisfies Partial<MockDataService>,
    },
  ];
}
