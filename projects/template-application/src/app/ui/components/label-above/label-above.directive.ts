import { Directive, inject } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';

/**
 * Puts a `mat-form-field`'s `<mat-label>` above the container instead of inside
 * it. Works with both `fill` and `outline` appearances. The styles live in
 * `styles/components/material-component-overrides/_mat-form-field.scss`.
 *
 *   <mat-form-field appearance="outline" appLabelAbove>
 *     <mat-label>Scan comment</mat-label>
 *     <input matInput placeholder="Placeholder" />
 *   </mat-form-field>
 */
@Directive({
  selector: 'mat-form-field[appLabelAbove]',
  host: { class: 'label-above' },
})
export class LabelAboveDirective {
  constructor() {
    // The label never sits inside the field, so keep it in the floated state;
    // that also keeps placeholders visible while the field is empty.
    inject(MatFormField).floatLabel = 'always';
  }
}
