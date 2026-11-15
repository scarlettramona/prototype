import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * Shared shell for "collection editor" panels used on the create and edit
 * resource pages. Renders the section header (title + count + "Add" button)
 * and either a slotted empty-state placeholder or projected content (the
 * actual `inline-edit-table`, list, or whatever the consumer renders).
 *
 * Consumers own the form fields and table markup; this component only owns
 * the chrome so every collection panel across create/edit pages stays
 * visually consistent.
 */
@Component({
  selector: 'app-edit-collection-panel',
  imports: [MatButtonModule],
  templateUrl: './edit-collection-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCollectionPanelComponent {
  readonly title = input.required<string>();
  readonly count = input.required<number>();
  readonly addLabel = input<string>('Add');
  readonly addDisabled = input<boolean>(false);
  readonly emptyMessage = input<string>('Nothing yet. Add one above.');
  readonly add = output<void>();
}
