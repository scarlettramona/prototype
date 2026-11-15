import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbService } from '../../../core/routing/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  imports: [AsyncPipe, RouterLink, MatIconModule],
})
export class BreadcrumbComponent {
  private readonly breadcrumbService = inject(BreadcrumbService);
  readonly breadcrumbs$ = this.breadcrumbService.breadcrumbs$;
}
