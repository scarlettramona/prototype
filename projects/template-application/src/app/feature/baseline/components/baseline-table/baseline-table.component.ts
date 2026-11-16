import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { lowerLimit, upperLimit, type BaselineValues } from '../../../../core/baseline/baseline.models';
import { formatDate } from '../../../../core/mock-data/dates';
import { formatTemp, type BaselineField } from '../../baseline-form.model';

export interface BaselineTableRow {
  /** Row label in the first column, e.g. "Current baseline". */
  label?: string;
  /** A tag after the date, e.g. "Current". */
  tag?: string;
  values: BaselineValues;
  savedBy?: string;
  /** Fields drawn in primary (changed). */
  changed?: ReadonlySet<BaselineField>;
}

type Column = 'label' | 'date' | 'value' | 'slope' | 'lowerOffset' | 'lower' | 'upperOffset' | 'upper' | 'comment' | 'savedBy';

const HEADERS: Record<Column, string> = {
  label: '',
  date: 'Start date',
  value: 'Baseline',
  slope: 'Slope rate',
  lowerOffset: 'Lower offset',
  lower: 'Lower limit',
  upperOffset: 'Upper offset',
  upper: 'Upper limit',
  comment: 'Comment',
  savedBy: 'Saved by',
};

/** Which fields each column depends on, for the changed (primary) colour. */
const DEPENDS: Partial<Record<Column, readonly BaselineField[]>> = {
  date: ['startDate'],
  value: ['value'],
  slope: ['slopeRatePerYear'],
  lowerOffset: ['lowerLimitOffset'],
  lower: ['value', 'lowerLimitOffset'],
  upperOffset: ['upperLimitOffset'],
  upper: ['value', 'upperLimitOffset'],
  comment: ['comment'],
};

const NUMERIC = new Set<Column>(['value', 'slope', 'lowerOffset', 'lower', 'upperOffset', 'upper']);

const WIDTHS: Record<Column, string> = {
  label: '150px',
  date: '128px',
  value: '96px',
  slope: '112px',
  lowerOffset: '124px',
  lower: '112px',
  upperOffset: '124px',
  upper: '112px',
  comment: 'minmax(200px, 1fr)',
  savedBy: '184px',
};

/**
 * Baseline records as a table (the history and confirmation dialogs): start
 * date, baseline, slope rate, lower and upper offsets with their limits, and the
 * comment. Values in °F (slope °F/yr). Changed values are drawn in primary.
 */
@Component({
  selector: 'app-baseline-table',
  template: `
    <div class="table app-data-table" role="table" [attr.aria-label]="ariaLabel()" [style.--columns]="template()">
      <div class="row app-data-table__head" role="row">
        @for (c of columns(); track c) {
          <span class="cell" [class.cell--end]="numeric.has(c)" role="columnheader">{{ headers[c] }}</span>
        }
      </div>
      @for (row of rows(); track $index) {
        <div class="row app-data-table__row" role="row">
          @for (c of columns(); track c) {
            <span class="cell" [class.cell--end]="numeric.has(c)" [class.cell--changed]="isChanged(row, c)" role="cell">
              @switch (c) {
                @case ('label') {
                  <span class="label">{{ row.label }}</span>
                }
                @case ('date') {
                  {{ date(row.values.startDate) }}
                  @if (row.tag) {
                    <span class="app-tag">{{ row.tag }}</span>
                  }
                }
                @case ('comment') {
                  <span class="comment">{{ row.values.comment || '--' }}</span>
                }
                @case ('savedBy') {
                  {{ row.savedBy ?? '--' }}
                }
                @default {
                  {{ number(row.values, c) }}
                }
              }
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      overflow-x: auto;
    }
    .table {
      min-width: max-content;
    }
    .row {
      display: grid;
      grid-template-columns: var(--columns);
      align-items: center;
      min-height: 48px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .cell {
      display: flex;
      align-items: center;
      gap: var(--spacing-80);
      min-width: 0;
      padding: var(--spacing-80) var(--spacing-160);
    }
    .cell--end {
      justify-content: flex-end;
    }
    .app-data-table__head .cell {
      white-space: nowrap;
    }
    .cell--changed {
      color: var(--mat-sys-primary);
    }
    .label {
      font-weight: var(--app-font-weight-bold);
    }
    .comment {
      white-space: normal;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaselineTableComponent {
  readonly rows = input.required<readonly BaselineTableRow[]>();
  /** Adds a first column with each row's label. */
  readonly showLabels = input(false);
  /** Adds a Saved by column. */
  readonly showSavedBy = input(false);
  readonly ariaLabel = input('Baselines');

  protected readonly headers = HEADERS;
  protected readonly numeric = NUMERIC;
  protected readonly date = formatDate;

  protected readonly columns = computed<Column[]>(() => [
    ...(this.showLabels() ? (['label'] as const) : []),
    'date',
    'value',
    'slope',
    'lowerOffset',
    'lower',
    'upperOffset',
    'upper',
    'comment',
    ...(this.showSavedBy() ? (['savedBy'] as const) : []),
  ]);

  protected readonly template = computed(() => this.columns().map((c) => WIDTHS[c]).join(' '));

  protected isChanged(row: BaselineTableRow, column: Column): boolean {
    const fields = DEPENDS[column];
    return !!row.changed && !!fields && fields.some((f) => row.changed!.has(f));
  }

  protected number(v: BaselineValues, column: Column): string {
    switch (column) {
      case 'value':
        return formatTemp(v.value);
      case 'slope':
        return formatTemp(v.slopeRatePerYear);
      case 'lowerOffset':
        return formatTemp(v.lowerLimitOffset);
      case 'lower':
        return formatTemp(lowerLimit(v));
      case 'upperOffset':
        return formatTemp(v.upperLimitOffset);
      case 'upper':
        return formatTemp(upperLimit(v));
      default:
        return '';
    }
  }
}
