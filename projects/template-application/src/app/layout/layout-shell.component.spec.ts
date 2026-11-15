import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LayoutShellComponent } from './layout-shell.component';

describe('LayoutShellComponent', () => {
  let component: LayoutShellComponent;
  let fixture: ComponentFixture<LayoutShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutShellComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles the sidenav', () => {
    expect(component.isNavOpen()).toBe(true);
    component.toggleNav();
    expect(component.isNavOpen()).toBe(false);
  });
});
