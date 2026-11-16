import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgTemplateOutlet } from '@angular/common';
import { formatDate } from '../../../../../core/mock-data/dates';
import {
  fieldId,
  formatParam,
  groupEdited,
  PARAM_GROUPS,
  paramValue,
  type ParamField,
  type ParamGroupDef,
} from '../../focus-model';
import { IllFocusStore } from '../../ill-focus-store';

/**
 * Analysis parameters (Figma 1:9821): preset select with Saved on / by,
 * Save as default · Run analysis, then Calculation Baseline and Miscellaneous
 * (read-only until Edit) beside the ILL and Marker method fields. An edited
 * field gets a dot and "Saved <value>" under it; Revert appears on groups
 * with edits.
 */
@Component({
  selector: 'app-analysis-parameters',
  imports: [NgTemplateOutlet, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './analysis-parameters.component.html',
  styleUrl: './analysis-parameters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisParametersComponent {
  protected readonly store = inject(IllFocusStore);
  protected readonly groups = PARAM_GROUPS;
  protected readonly methods = ['Intercept', 'None'];

  protected readonly savedOn = computed(() => {
    const saved = this.store.focused()?.analysis.saved;
    return saved ? formatDate(saved.savedAt) : '—';
  });
  protected readonly savedBy = computed(() => this.store.focused()?.analysis.saved?.savedBy ?? '—');

  protected editable(g: ParamGroupDef): boolean {
    return !g.readOnly || this.store.editingGroups().has(g.group);
  }

  protected showRevert(g: ParamGroupDef): boolean {
    return groupEdited(this.store.edited(), g.group);
  }

  protected isEdited(field: ParamField): boolean {
    return this.store.edited().has(fieldId(field));
  }

  protected value(field: ParamField): string {
    const d = this.store.draft();
    return d ? formatParam(paramValue(d, field), field.kind) : '';
  }

  /** `yyyy-mm-dd` for the date input. */
  protected isoDate(field: ParamField): string {
    const d = this.store.draft();
    if (!d) return '';
    const t = new Date(paramValue(d, field) as number);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  protected savedHint(field: ParamField): string {
    const r = this.store.reference();
    if (!r) return '';
    return `Saved ${formatParam(paramValue(r, field), field.kind)}${field.unit ? ' ' + field.unit : ''}`;
  }

  protected setNumber(field: ParamField, raw: string): void {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) this.store.setField(field.group, field.key, Math.round(n * 1000) / 1000);
  }

  protected setDate(field: ParamField, raw: string): void {
    const [y, m, d] = raw.split('-').map(Number);
    if (y && m && d) this.store.setField(field.group, field.key, new Date(y, m - 1, d).getTime());
  }

  protected setText(field: ParamField, raw: string): void {
    this.store.setField(field.group, field.key, raw);
  }

  protected groupAction(g: ParamGroupDef): void {
    if (this.showRevert(g)) this.store.revert(g.group);
    else this.store.editGroup(g.group);
  }

  protected actionLabel(g: ParamGroupDef): string {
    if (this.showRevert(g)) return 'Revert';
    return g.readOnly && !this.editable(g) ? 'Edit' : '';
  }
}
