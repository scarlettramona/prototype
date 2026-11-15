import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrototypeStateService } from '../../../core/prototype-state/prototype-state.service';
import { PROTOTYPE_STATES, PROTOTYPE_STATE_NAMES, type PrototypeStateName } from '../../../core/prototype-state/prototype-states';

interface StateGroup {
  label: string;
  names: PrototypeStateName[];
}

/** Dev-only menu listing every `?state=` fixture. Shown in the header in dev builds. */
@Component({
  selector: 'app-state-menu',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button mat-icon-button type="button" aria-label="Prototype states" matTooltip="Prototype states" [matMenuTriggerFor]="menu">
      <mat-icon>tune</mat-icon>
    </button>
    <mat-menu #menu="matMenu" class="state-menu">
      @for (group of groups; track group.label) {
        <div class="state-menu__group mat-font-label-md">{{ group.label }}</div>
        @for (name of group.names; track name) {
          <button mat-menu-item type="button" (click)="service.apply(name)">
            <mat-icon>{{ name === active() ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
            <span>{{ name }}</span>
          </button>
        }
      }
      <mat-divider />
      <button mat-menu-item type="button" [disabled]="!active()" (click)="service.clear()">
        <mat-icon>close</mat-icon>
        <span>Clear state</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .state-menu__group {
      padding: var(--spacing-80) var(--spacing-160) var(--spacing-40);
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateMenuComponent {
  protected readonly service = inject(PrototypeStateService);
  protected readonly active = computed(() => this.service.state()?.name ?? null);

  protected readonly groups: StateGroup[] = [
    { label: 'VNV', names: PROTOTYPE_STATE_NAMES.filter((n) => PROTOTYPE_STATES[n].module === 'vnv') },
    {
      label: 'ILL · Scan library',
      names: PROTOTYPE_STATE_NAMES.filter((n) => {
        const f = PROTOTYPE_STATES[n];
        return f.module === 'ill' && f.screen === 'library';
      }),
    },
    {
      label: 'ILL · Focus view',
      names: PROTOTYPE_STATE_NAMES.filter((n) => {
        const f = PROTOTYPE_STATES[n];
        return f.module === 'ill' && f.screen === 'focus';
      }),
    },
  ];
}
