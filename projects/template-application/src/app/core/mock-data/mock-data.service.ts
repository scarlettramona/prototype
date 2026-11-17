import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { buildIllDataset, type IllDataset } from '../ill/ill-generator';
import { parseIllSource } from '../ill/ill-source';
import { buildVnvDataset, type VnvDataset } from '../vnv/vnv-generator';
import { parseVnvSource } from '../vnv/vnv-source';
import { MOCK_DATA_CONFIG } from './mock-data.config';
import { daysBetween, MOCK_DATA_ANCHOR, MOCK_TODAY } from './today';

/** Where the real exports are served from (`public/mock-data/`). */
export const MOCK_DATA_URL = 'mock-data';

/**
 * Loads the real CSV exports once and builds the seeded datasets from them.
 * The mock services read through this; nothing else should.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly http = inject(HttpClient);
  private readonly today = inject(MOCK_TODAY);
  private vnv?: Promise<VnvDataset>;
  private ill?: Promise<IllDataset>;

  vnvDataset(): Promise<VnvDataset> {
    this.vnv ??= Promise.all([this.text('vnv/vnv-readings.csv'), this.text('vnv/vnv-metadata.csv')]).then(([r, m]) =>
      buildVnvDataset(parseVnvSource(r, m), MOCK_DATA_CONFIG, this.today),
    );
    return this.vnv;
  }

  illDataset(): Promise<IllDataset> {
    this.ill ??= Promise.all([this.text('ill/ill-scans.csv'), this.text('ill/ill-scan-metadata.csv')]).then(([s, m]) =>
      buildIllDataset(parseIllSource(s, m), MOCK_DATA_CONFIG, daysBetween(MOCK_DATA_ANCHOR, this.today)),
    );
    return this.ill;
  }

  private text(path: string): Promise<string> {
    return firstValueFrom(this.http.get(`${MOCK_DATA_URL}/${path}`, { responseType: 'text' }));
  }
}
