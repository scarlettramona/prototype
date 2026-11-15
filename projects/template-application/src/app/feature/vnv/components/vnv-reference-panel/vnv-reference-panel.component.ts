import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { seriesStyle } from '../../../../core/charts/chart-palette';
import { formatDate } from '../../../../core/mock-data/dates';
import { DetailRowComponent } from '../../../../ui/components/detail-row/detail-row.component';
import { LegendRowComponent } from '../../../../ui/components/legend-row/legend-row.component';
import { PanelSectionComponent } from '../../../../ui/components/panel-section/panel-section.component';
import { SidePanelComponent } from '../../../../ui/components/side-panel/side-panel.component';
import { SwatchSelectComponent, type SwatchOption } from '../../../../ui/components/swatch-select/swatch-select.component';
import { VnvStore } from '../../vnv-store';

/**
 * The VNV right panel (Figma floating-parameters 1:11547), in Figma's order:
 * Legend · Baseline sensor · Equipment out of service.
 */
@Component({
  selector: 'app-vnv-reference-panel',
  imports: [DetailRowComponent, LegendRowComponent, PanelSectionComponent, SidePanelComponent, SwatchSelectComponent],
  template: `
    <app-side-panel class="panel">
      <app-panel-section title="Legend">
        <div class="legend">
          @for (row of legend(); track row.id) {
            <app-legend-row [label]="row.id" [swatch]="row.swatch" [visible]="row.visible" (visibleChange)="store.toggleSensor(row.id)" />
          }
        </div>
      </app-panel-section>

      <app-panel-section title="Baseline sensor" titleStyle="label">
        <app-swatch-select [options]="options()" [value]="store.baselineSensorId()" (valueChange)="store.baselineSensorId.set($event)" ariaLabel="Baseline sensor" />
        @if (store.baseline(); as b) {
          <div class="details">
            <app-detail-row label="Baseline" [value]="b.value.toFixed(2)" unit="°F" />
            <app-detail-row label="Upper limit offset" [value]="b.upperLimitOffset.toFixed(2)" unit="°F" />
            <app-detail-row label="Lower limit offset" [value]="b.lowerLimitOffset.toFixed(2)" unit="°F" />
            <app-detail-row label="Slope rate" [value]="b.slopeRatePerYear.toFixed(2)" unit="°F" />
            <app-detail-row label="Baseline start date" [value]="date(b.startDate)" />
          </div>
        }
      </app-panel-section>

      <app-panel-section title="Equipment out of service" titleStyle="label">
        <app-swatch-select [options]="options()" [value]="store.oosSensorId()" (valueChange)="store.oosSensorId.set($event)" ariaLabel="Equipment out of service" />
        <div class="details">
          <app-detail-row label="Start date" [value]="oos()?.start ?? ''" />
          <app-detail-row label="End date" [value]="oos()?.end ?? ''" />
        </div>
      </app-panel-section>
    </app-side-panel>
  `,
  styles: `
    :host {
      display: block;
      min-height: 0;
    }
    .panel {
      height: 100%;
    }
    .legend {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-160);
    }
    .details {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-80);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnvReferencePanelComponent {
  protected readonly store = inject(VnvStore);
  protected readonly date = formatDate;

  private readonly sensors = computed(() => this.store.result()?.sensors ?? []);

  protected readonly legend = computed(() => {
    const hidden = this.store.hiddenSensorIds();
    return this.sensors().map((s) => ({ id: s.id, swatch: seriesStyle(s.colorIndex), visible: !hidden.has(s.id) }));
  });

  protected readonly options = computed<SwatchOption[]>(() =>
    this.sensors().map((s) => ({ value: s.id, label: s.id, swatch: seriesStyle(s.colorIndex) })),
  );

  /** The selected sensor's first out-of-service window, formatted; null when it has none. */
  protected readonly oos = computed(() => {
    const w = this.store.outOfService()[0];
    return w ? { start: formatDate(w.start), end: formatDate(w.end) } : null;
  });
}
