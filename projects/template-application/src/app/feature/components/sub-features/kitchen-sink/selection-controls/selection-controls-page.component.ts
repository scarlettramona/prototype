import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { PageComponent } from '../../../../../ui/patterns/page/page.component';

type Task = {
  name: string;
  completed: boolean;
  subtasks?: Task[];
};

/** Kitchen-sink page: checkbox, slide-toggle and button-toggle. */
@Component({
  selector: 'app-ks-selection-controls-page',
  imports: [PageComponent, FormsModule, MatCheckboxModule, MatSlideToggleModule, MatButtonToggleModule],
  templateUrl: './selection-controls-page.component.html',
  styleUrl: './selection-controls-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionControlsPageComponent {
  // Checkbox task list (parent + indeterminate)
  readonly task = signal<Task>({
    name: 'Parent task',
    completed: false,
    subtasks: [
      { name: 'Child task 1', completed: false },
      { name: 'Child task 2', completed: false },
      { name: 'Child task 3', completed: false },
    ],
  });

  readonly partiallyComplete = computed(() => {
    const task = this.task();
    if (!task.subtasks) {
      return false;
    }
    return task.subtasks.some((t) => t.completed) && !task.subtasks.every((t) => t.completed);
  });

  update(completed: boolean, index?: number): void {
    this.task.update((task) => {
      if (index === undefined) {
        task.completed = completed;
        task.subtasks?.forEach((t) => (t.completed = completed));
      } else {
        task.subtasks![index].completed = completed;
        task.completed = task.subtasks?.every((t) => t.completed) ?? true;
      }
      return { ...task };
    });
  }

  // Button-toggle selection indicators
  readonly hideSingleSelectionIndicator = signal(false);
  readonly hideMultipleSelectionIndicator = signal(false);

  toggleSingleSelectionIndicator(): void {
    this.hideSingleSelectionIndicator.update((value) => !value);
  }

  toggleMultipleSelectionIndicator(): void {
    this.hideMultipleSelectionIndicator.update((value) => !value);
  }
}
