import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  ACCENT_COLORS,
  LozengeComponent,
  LozengeDropdownTriggerComponent,
  SEMANTIC_COLORS,
  type SemanticColor,
} from 'beta-library';

import { PageComponent } from '../../../../ui/patterns/page/page.component';

type DemoRow = {
  id: string;
  name: string;
  status: SemanticColor;
};

/** Human labels for the semantic statuses used in the interactive demos. */
const STATUS_LABELS: Record<SemanticColor, string> = {
  neutral: 'Draft',
  information: 'In progress',
  success: 'Complete',
  warning: 'At risk',
  danger: 'Failed',
};

@Component({
  selector: 'app-lozenges-demo',
  imports: [
    PageComponent,
    LozengeComponent,
    LozengeDropdownTriggerComponent,
    MatMenuModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './lozenges-demo.component.html',
  styleUrl: './lozenges-demo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LozengesDemoComponent {
  // Canonical appearance lists come from the library — no need to re-declare.
  readonly semanticColors = SEMANTIC_COLORS;
  readonly accentColors = ACCENT_COLORS;

  readonly statusOptions = Object.keys(STATUS_LABELS) as SemanticColor[];

  // Editable status table (realistic in-context usage).
  readonly rows = signal<DemoRow[]>([
    { id: 'JOB-1024', name: 'Nightly export · Apr 14', status: 'success' },
    { id: 'JOB-1025', name: 'Nightly export · Apr 15', status: 'information' },
    { id: 'JOB-1026', name: 'Index rebuild · Apr 15', status: 'warning' },
    { id: 'JOB-1027', name: 'Report delivery · Apr 16', status: 'danger' },
  ]);

  /** Row id whose status menu is open (drives the trigger's selected state). */
  readonly menuOpenFor = signal<string | null>(null);

  // Standalone interactive trigger.
  readonly pickedStatus = signal<SemanticColor>('information');
  readonly standaloneMenuOpen = signal(false);
  readonly loading = signal(false);

  labelFor(status: SemanticColor): string {
    return STATUS_LABELS[status];
  }

  setRowStatus(id: string, status: SemanticColor): void {
    this.rows.update((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
  }
}
