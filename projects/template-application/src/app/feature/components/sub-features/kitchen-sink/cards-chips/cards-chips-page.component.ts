import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { PageComponent } from '../../../../../ui/patterns/page/page.component';

type Vegetable = {
  name: string;
};

/** Kitchen-sink page: card and chips (stacked + drag-and-drop). */
@Component({
  selector: 'app-ks-cards-chips-page',
  imports: [NgOptimizedImage, PageComponent, MatCardModule, MatButtonModule, MatChipsModule, CdkDropList, CdkDrag],
  templateUrl: './cards-chips-page.component.html',
  styleUrl: './cards-chips-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsChipsPageComponent {
  readonly bestBoys: string[] = ['Samoyed', 'Akita Inu', 'Alaskan Malamute', 'Siberian Husky'];

  readonly vegetables = signal<Vegetable[]>([
    { name: 'apple' },
    { name: 'banana' },
    { name: 'strawberry' },
    { name: 'orange' },
    { name: 'kiwi' },
    { name: 'cherry' },
  ]);

  drop(event: CdkDragDrop<Vegetable[]>): void {
    this.vegetables.update((vegetables) => {
      moveItemInArray(vegetables, event.previousIndex, event.currentIndex);
      return [...vegetables];
    });
  }
}
