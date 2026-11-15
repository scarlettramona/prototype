import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { PageComponent } from '../../../../../../ui/patterns/page/page.component';

type StateGroup = {
  letter: string;
  names: string[];
};

const filterNames = (opt: string[], value: string): string[] => {
  const filterValue = value.toLowerCase();
  return opt.filter((item) => item.toLowerCase().includes(filterValue));
};

/** Kitchen-sink page: form fields, inputs, select and autocomplete. */
@Component({
  selector: 'app-ks-form-controls-page',
  imports: [
    PageComponent,
    FormsModule,
    ReactiveFormsModule,
    AsyncPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
  ],
  templateUrl: './form-controls-page.component.html',
  styleUrl: './form-controls-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormControlsPageComponent {
  private readonly fb = inject(FormBuilder);

  // Simple autocomplete
  readonly autoControl = new FormControl('');
  readonly autoOptions: string[] = ['One', 'Two', 'Three'];

  // Select (2-way binding)
  selected = 'option2';

  // Option-group autocomplete
  readonly stateForm = this.fb.group({ stateGroup: '' });
  readonly stateGroups: StateGroup[] = [
    { letter: 'A', names: ['Alabama', 'Alaska', 'Arizona', 'Arkansas'] },
    { letter: 'C', names: ['California', 'Colorado', 'Connecticut'] },
    { letter: 'D', names: ['Delaware'] },
    { letter: 'F', names: ['Florida'] },
    { letter: 'G', names: ['Georgia'] },
    { letter: 'H', names: ['Hawaii'] },
    { letter: 'I', names: ['Idaho', 'Illinois', 'Indiana', 'Iowa'] },
    { letter: 'K', names: ['Kansas', 'Kentucky'] },
    { letter: 'L', names: ['Louisiana'] },
    {
      letter: 'M',
      names: ['Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana'],
    },
    {
      letter: 'N',
      names: [
        'Nebraska',
        'Nevada',
        'New Hampshire',
        'New Jersey',
        'New Mexico',
        'New York',
        'North Carolina',
        'North Dakota',
      ],
    },
    { letter: 'O', names: ['Ohio', 'Oklahoma', 'Oregon'] },
    { letter: 'P', names: ['Pennsylvania'] },
    { letter: 'R', names: ['Rhode Island'] },
    { letter: 'S', names: ['South Carolina', 'South Dakota'] },
    { letter: 'T', names: ['Tennessee', 'Texas'] },
    { letter: 'U', names: ['Utah'] },
    { letter: 'V', names: ['Vermont', 'Virginia'] },
    { letter: 'W', names: ['Washington', 'West Virginia', 'Wisconsin', 'Wyoming'] },
  ];
  readonly stateGroupOptions: Observable<StateGroup[]>;

  constructor() {
    this.stateGroupOptions = this.stateForm.get('stateGroup')!.valueChanges.pipe(
      startWith(''),
      map((value) => this.filterGroup(value || '')),
    );
  }

  private filterGroup(value: string): StateGroup[] {
    if (value) {
      return this.stateGroups
        .map((group) => ({
          letter: group.letter,
          names: filterNames(group.names, value),
        }))
        .filter((group) => group.names.length > 0);
    }
    return this.stateGroups;
  }
}
