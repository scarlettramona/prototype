import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTableModule } from '@angular/material/table';

import { WrapperTableComponent } from './wrapper-table.component';

type Row = { id: number; name: string };

@Component({
  imports: [MatTableModule, WrapperTableComponent],
  template: `
    <app-wrapper-table tableClass="list-table" [dataSource]="rows">
      <ng-container matColumnDef="id">
        <th *matHeaderCellDef mat-header-cell>ID</th>
        <td *matCellDef="let row" mat-cell>{{ row.id }}</td>
      </ng-container>

      <ng-container matColumnDef="name">
        <th *matHeaderCellDef mat-header-cell>Name</th>
        <td *matCellDef="let row" mat-cell>{{ row.name }}</td>
      </ng-container>

      <tr *matHeaderRowDef="columns" mat-header-row></tr>
      <tr *matRowDef="let row; columns: columns" mat-row></tr>

      <tr *matNoDataRow>
        <td [attr.colspan]="columns.length">Nothing here</td>
      </tr>
    </app-wrapper-table>
  `,
})
class HostComponent {
  readonly columns = ['id', 'name'];
  rows: Row[] = [
    { id: 1, name: 'first' },
    { id: 2, name: 'second' },
  ];
}

describe('WrapperTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const render = async (rows: Row[]): Promise<HTMLElement> => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.rows = rows;
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  it('projects the column, header and row definitions into the table', async () => {
    const el = await render([
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ]);

    const headers = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['ID', 'Name']);

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('first');
  });

  it('applies the table class', async () => {
    const el = await render([{ id: 1, name: 'first' }]);
    expect(el.querySelector('table')?.classList).toContain('list-table');
  });

  it('renders the projected no-data row when the data source is empty', async () => {
    const el = await render([]);
    expect(el.textContent).toContain('Nothing here');
  });
});
