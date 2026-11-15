import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button-demo',
  imports: [MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './button-demo.component.html',
  styleUrl: './button-demo.component.scss',
})
export class ButtonDemoComponent {}
