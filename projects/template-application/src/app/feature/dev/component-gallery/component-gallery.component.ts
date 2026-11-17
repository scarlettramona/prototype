import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { seriesStyle } from '../../../core/charts/chart-palette';
import { parseUsDate } from '../../../core/mock-data/dates';
import { QI_VALUES, type Qi } from '../../../core/qi/qi.models';
import { ChartCardComponent } from '../../../ui/components/chart-card/chart-card.component';
import { DateRangeFieldComponent, type DateRangeValue } from '../../../ui/components/date-range-field/date-range-field.component';
import { DetailRowComponent } from '../../../ui/components/detail-row/detail-row.component';
import { LegendRowComponent } from '../../../ui/components/legend-row/legend-row.component';
import { PanelSectionComponent } from '../../../ui/components/panel-section/panel-section.component';
import { QiIconComponent } from '../../../ui/components/qi-icon/qi-icon.component';
import { QualityFilterComponent } from '../../../ui/components/quality-filter/quality-filter.component';
import { SelectionActionBarComponent } from '../../../ui/components/selection-action-bar/selection-action-bar.component';
import { SeriesSwatchComponent } from '../../../ui/components/series-swatch/series-swatch.component';
import { SidePanelComponent } from '../../../ui/components/side-panel/side-panel.component';
import { SwatchSelectComponent, type SwatchOption } from '../../../ui/components/swatch-select/swatch-select.component';
import { ViewSwitcherComponent, type ContentView } from '../../../ui/components/view-switcher/view-switcher.component';
import { VnvFormComponent } from '../../../ui/components/vnv-form/vnv-form.component';
import { VnvPageHeaderComponent } from '../../vnv/components/vnv-page-header/vnv-page-header.component';

const SENSORS = Array.from({ length: 12 }, (_, i) => `AN102-WSTA-TI-0${41 + i}`);

/**
 * Dev-only gallery: every shared component in every state, for side-by-side
 * comparison with the Figma frames (file Eb0lHuZv2e067FftD2RuqL). Outputs are
 * logged to the Events line.
 */
@Component({
  selector: 'app-component-gallery',
  imports: [
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButtonModule,
    ChartCardComponent,
    DateRangeFieldComponent,
    DetailRowComponent,
    LegendRowComponent,
    PanelSectionComponent,
    QiIconComponent,
    QualityFilterComponent,
    SelectionActionBarComponent,
    SeriesSwatchComponent,
    SidePanelComponent,
    SwatchSelectComponent,
    ViewSwitcherComponent,
    VnvFormComponent,
    VnvPageHeaderComponent,
  ],
  templateUrl: './component-gallery.component.html',
  styleUrl: './component-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentGalleryComponent {
  protected readonly events = signal<string[]>([]);

  // Page header
  protected readonly range = signal<DateRangeValue>({ start: parseUsDate('1/1/2025'), end: parseUsDate('11/9/2026') });
  protected readonly showAll = signal(true);
  protected readonly view = signal<ContentView>('chart');
  protected readonly tableView = signal<ContentView>('table');
  protected readonly loaded = { name: '241-AN-TMAC-103-TI', sensorCount: 6 };

  // Quality filter
  protected readonly qiAll = signal<Qi[]>([...QI_VALUES]);
  protected readonly qiMixed = signal<Qi[]>(['Good', 'Unreviewed', 'Transcribed']);
  protected readonly qiNone = signal<Qi[]>([]);
  protected readonly qis = QI_VALUES;

  // Swatches and legends
  protected readonly swatchIndexes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 39];
  protected readonly style = seriesStyle;
  protected readonly legend = SENSORS.slice(0, 9).map((id, i) => ({ id, swatch: seriesStyle(i), visible: signal(i !== 3 && i !== 6) }));
  protected readonly scans = [
    { label: '10/25/2023 12:07 PM', i: 0, visible: signal(false) },
    { label: '10/25/2023 12:07 PM', i: 1, visible: signal(true), focused: true },
    { label: '10/25/2023 12:07 PM', i: 2, visible: signal(false) },
    { label: '10/25/2023 12:07 PM', i: 3, visible: signal(false) },
    { label: '10/25/2023 12:07 PM', i: 4, visible: signal(true) },
  ];
  protected readonly savedVisible = signal(true);
  protected readonly unsavedVisible = signal(true);

  // Selects
  protected readonly sensorOptions: SwatchOption[] = SENSORS.map((id, i) => ({ value: id, label: id, swatch: seriesStyle(i) }));
  protected readonly baselineSensor = signal<string | null>(SENSORS[7]);
  protected readonly oosSensor = signal<string | null>(null);

  // Popovers
  protected readonly vnvPopoverOpen = signal(false);
  protected readonly popoverPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  ];

  protected log(name: string, value?: unknown): void {
    const text = value === undefined ? name : `${name}: ${JSON.stringify(value)}`;
    this.events.update((e) => [text, ...e].slice(0, 6));
  }
}
