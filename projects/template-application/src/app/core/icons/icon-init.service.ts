import { inject, Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class IconInitService {
  readonly iconRegistry = inject(MatIconRegistry);
  readonly sanitizer = inject(DomSanitizer);

  init(): void {
    const logoIcon = this.sanitizer.bypassSecurityTrustResourceUrl('logo-small.svg');
    this.iconRegistry.addSvgIcon('logo-small', logoIcon);
  }
}
