import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbService } from '../../../core/routing/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  imports: [RouterLink, MatIconModule],
})
export class BreadcrumbComponent {
  readonly breadcrumbs = inject(BreadcrumbService).breadcrumbs;
}
