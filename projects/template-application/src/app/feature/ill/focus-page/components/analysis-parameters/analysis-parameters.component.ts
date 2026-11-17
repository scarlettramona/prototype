import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgTemplateOutlet } from '@angular/common';
import { formatDate, formatIsoDate } from '../../../../../core/mock-data/dates';
import {
  activeFields,
  fieldId,
  formatParam,
  PARAM_GROUPS,
  paramValue,
  type ParamField,
  type ParamGroupDef,
} from '../../focus-model';
import { IllFocusStore } from '../../ill-focus-store';

/**
 * Analysis parameters (Figma 1:9821): preset select with the preset's Saved
 * on / by, Save as default · Run analysis, then four tiles. Every tile is
 * read-only until Edit; in edit, its button is Revert, which restores the tile
 * and returns it to read mode. Run analysis, Save as default and Save analysis
 * also return tiles to read mode. An edited field keeps a primary dot and
 * "Saved <value>" under it, in either mode, until it is saved.
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

  /** The preset's own saved on / by: a preset is always saved (Default included). */
  protected readonly savedOn = computed(() => {
    const p = this.store.selectedPreset();
    return p ? formatDate(p.savedAt) : '';
  });
  protected readonly savedBy = computed(() => this.store.selectedPreset()?.savedBy ?? '');

  protected editable(g: ParamGroupDef): boolean {
    return this.store.editingGroups().has(g.group);
  }

  protected isEdited(field: ParamField): boolean {
    return this.store.edited().has(fieldId(field));
  }

  /** The group's fields for the draft's method: a method group shows only its chosen method's settings. */
  protected fields(g: ParamGroupDef): ParamField[] {
    const d = this.store.draft();
    return d ? activeFields(g, d) : g.fields;
  }

  protected value(field: ParamField): string {
    const d = this.store.draft();
    return d ? formatParam(paramValue(d, field), field.kind, field.decimals) : '';
  }

  /** `yyyy-mm-dd` for the date input. */
  protected isoDate(field: ParamField): string {
    const d = this.store.draft();
    if (!d) return '';
    return formatIsoDate(paramValue(d, field) as number);
  }

  protected savedHint(field: ParamField): string {
    const r = this.store.reference();
    if (!r) return '';
    return `Saved ${formatParam(paramValue(r, field), field.kind, field.decimals)}${field.unit ? ' ' + field.unit : ''}`;
  }

  protected setNumber(field: ParamField, raw: string): void {
    const n = Number.parseFloat(raw);
    const scale = 10 ** (field.decimals ?? 3);
    if (Number.isFinite(n)) this.store.setField(field.group, field.key, Math.round(n * scale) / scale);
  }

  protected setDate(field: ParamField, raw: string): void {
    const [y, m, d] = raw.split('-').map(Number);
    if (y && m && d) this.store.setField(field.group, field.key, new Date(y, m - 1, d).getTime());
  }

  protected setText(field: ParamField, raw: string): void {
    this.store.setField(field.group, field.key, raw);
  }

  protected groupAction(g: ParamGroupDef): void {
    if (this.editable(g)) this.store.revert(g.group);
    else this.store.editGroup(g.group);
  }

  protected actionLabel(g: ParamGroupDef): string {
    return this.editable(g) ? 'Revert' : 'Edit';
  }
}
