import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';

import { LabelAboveDirective } from './label-above.directive';

@Component({
  imports: [MatFormFieldModule, MatInputModule, LabelAboveDirective],
  template: `
    <mat-form-field appearance="outline" appLabelAbove>
      <mat-label>Scan comment</mat-label>
      <input matInput placeholder="Placeholder" />
    </mat-form-field>
  `,
})
class HostComponent {}

describe('LabelAboveDirective', () => {
  it('adds the label-above class and keeps the label floated', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    const field = fixture.debugElement.query(By.directive(MatFormField));
    expect(field.nativeElement.classList).toContain('label-above');
    expect(field.injector.get(MatFormField).floatLabel).toBe('always');
  });
});
