import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  input,
  viewChild,
} from '@angular/core';
import {
  MatColumnDef,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';

/**
 * Wraps `<table mat-table>` so pages can project their own column, header,
 * row and no-data definitions while the table chrome stays in one place.
 * Material's table only picks up definitions declared in its own template,
 * so projected ones are registered by hand once content has initialised.
 */
@Component({
  selector: 'app-wrapper-table',
  imports: [MatTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wrapper-table.component.html',
  styleUrl: './wrapper-table.component.scss',
})
export class WrapperTableComponent<T> implements AfterContentInit {
  readonly dataSource = input.required<MatTableDataSource<T> | readonly T[]>();
  readonly tableClass = input<string>('');

  private readonly columnDefs = contentChildren(MatColumnDef);
  private readonly headerRowDefs = contentChildren(MatHeaderRowDef);
  private readonly rowDefs = contentChildren<MatRowDef<T>>(MatRowDef);
  private readonly noDataRow = contentChild(MatNoDataRow);
  private readonly table = viewChild.required<MatTable<T>>(MatTable);

  ngAfterContentInit(): void {
    const table = this.table();
    this.columnDefs().forEach((def) => table.addColumnDef(def));
    this.rowDefs().forEach((def) => table.addRowDef(def));
    this.headerRowDefs().forEach((def) => table.addHeaderRowDef(def));

    const noDataRow = this.noDataRow();
    if (noDataRow) {
      table.setNoDataRow(noDataRow);
    }
  }
}
