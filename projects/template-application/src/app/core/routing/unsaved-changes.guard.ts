import type { CanDeactivateFn } from '@angular/router';
import type { Observable } from 'rxjs';

/**
 * implemented by pages that hold unsaved form state. The router guard below
 * defers the "is it safe to leave?" decision to the
 * component, since only it knows whether its draft is dirty.
 */

export type CanComponentDeactivate = {
  canDeactivate(): boolean | Observable<boolean>;
};

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => component.canDeactivate();
