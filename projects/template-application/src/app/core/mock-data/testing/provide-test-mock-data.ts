import type { Provider } from '@angular/core';
import { MOCK_LATENCY } from '../latency';
import { MockDataService } from '../mock-data.service';
import { buildTestIllDataset, buildTestVnvDataset } from './load-mock-sources';

/** Test providers: datasets built from the CSVs on disk, no latency. Fresh per call. */
export function provideTestMockData(): Provider[] {
  const vnv = buildTestVnvDataset();
  const ill = buildTestIllDataset();
  return [
    { provide: MOCK_LATENCY, useValue: () => 0 },
    {
      provide: MockDataService,
      useValue: { vnvDataset: () => Promise.resolve(vnv), illDataset: () => Promise.resolve(ill) } satisfies Partial<MockDataService>,
    },
  ];
}
