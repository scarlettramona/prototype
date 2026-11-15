import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ToastService } from '../toast.service';
import { ToastComponent } from '../toast.component';

@Component({
  selector: 'lib-toast-container',
  imports: [AsyncPipe, ToastComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  readonly activeToasts$ = this.toastService.activeToasts$;

  onDismissed(id: string): void {
    this.toastService.dismiss(id);
  }
}
