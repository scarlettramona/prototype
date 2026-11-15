import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatStepperModule } from '@angular/material/stepper';

import { PageComponent } from '../../../../../ui/patterns/page/page.component';

/** Kitchen-sink page: expansion panel, stepper and paginator. */
@Component({
  selector: 'app-ks-layout-nav-page',
  imports: [
    PageComponent,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
  ],
  templateUrl: './layout-nav-page.component.html',
  styleUrl: './layout-nav-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutNavPageComponent {
  private readonly fb = inject(FormBuilder);

  // Expansion panel
  readonly panelOpenState = signal(false);

  // Stepper
  readonly isLinear = signal(false);
  readonly firstFormGroup = this.fb.group({
    firstCtrl: ['', Validators.required],
  });
  readonly secondFormGroup = this.fb.group({
    secondCtrl: ['', Validators.required],
  });

  toggleLinear(): void {
    this.isLinear.update((value) => !value);
  }
}
