import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';

import { PageComponent } from '../../../../../../ui/patterns/page/page.component';

/** Kitchen-sink page: date and time pickers. */
@Component({
  selector: 'app-ks-pickers-page',
  imports: [PageComponent, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatTimepickerModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './pickers-page.component.html',
  styleUrl: './pickers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickersPageComponent {}
