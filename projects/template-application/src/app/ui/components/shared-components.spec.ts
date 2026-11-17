import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import type { Qi } from '../../core/qi/qi.models';
import { DateRangeFieldComponent, type DateRangeValue } from './date-range-field/date-range-field.component';
import { DetailRowComponent } from './detail-row/detail-row.component';
import { LegendRowComponent } from './legend-row/legend-row.component';
import { QualityFilterComponent } from './quality-filter/quality-filter.component';
import { SeriesSwatchComponent } from './series-swatch/series-swatch.component';
import { ViewSwitcherComponent, type ContentView } from './view-switcher/view-switcher.component';
import { VnvFormComponent, type VnvFormValue } from './vnv-form/vnv-form.component';

async function render<T>(component: Type<T>) {
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement, instance: fixture.componentInstance };
}

function click(el: Element | null): void {
  (el as HTMLElement).click();
}

describe('Shared components', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNativeDateAdapter()] }));

  describe('View switcher', () => {
    @Component({ imports: [ViewSwitcherComponent], template: '<app-view-switcher [(value)]="view" />' })
    class Host {
      view = signal<ContentView>('chart');
    }

    it('selects the other view on click', async () => {
      const { fixture, el, instance } = await render(Host);
      // Chart view first (where the page opens), then Table view.
      const buttons = el.querySelectorAll('button');
      expect([...buttons].map((b) => b.textContent?.trim())).toEqual(['Chart view', 'Table view']);
      expect(buttons[0].getAttribute('aria-checked')).toBe('true');
      click(buttons[1]);
      await fixture.whenStable();
      expect(instance.view()).toBe('table');
    });
  });

  describe('Quality filter', () => {
    @Component({ imports: [QualityFilterComponent], template: '<app-quality-filter [(value)]="shown" />' })
    class Host {
      shown = signal<Qi[]>(['Good', 'Suspect', 'Unreviewed', 'Transcribed']);
    }

    it('toggles a QI off and back on, keeping QI order', async () => {
      const { fixture, el, instance } = await render(Host);
      const chips = el.querySelectorAll('button');
      expect(chips.length).toBe(4);
      click(chips[1]);
      await fixture.whenStable();
      expect(instance.shown()).toEqual(['Good', 'Unreviewed', 'Transcribed']);
      expect(chips[1].getAttribute('aria-pressed')).toBe('false');
      click(chips[1]);
      await fixture.whenStable();
      expect(instance.shown()).toEqual(['Good', 'Suspect', 'Unreviewed', 'Transcribed']);
    });
  });

  describe('Legend row', () => {
    @Component({
      imports: [LegendRowComponent],
      template: `
        <app-legend-row class="toggle" label="AN102-WSTA-TI-054" [swatch]="swatch" [(visible)]="a" />
        <app-legend-row class="locked" mode="checkbox" label="Focused" [swatch]="swatch" [(visible)]="b" [locked]="true" />
      `,
    })
    class Host {
      swatch = { color: '#4C8DF6', dash: 'solid' as const };
      a = signal(true);
      b = signal(true);
    }

    it('toggle mode hides and shows on click', async () => {
      const { fixture, el, instance } = await render(Host);
      const btn = el.querySelector('.toggle button')!;
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      click(btn);
      await fixture.whenStable();
      expect(instance.a()).toBe(false);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('a locked checkbox row stays checked and is aria-disabled, but not dimmed', async () => {
      const { el, fixture } = await render(Host);
      const input = el.querySelector('.locked input[type=checkbox]') as HTMLInputElement;
      // disabledInteractive: focusable and announced as disabled, drawn like a normal checked box.
      expect(input.disabled).toBe(false);
      expect(input.getAttribute('aria-disabled')).toBe('true');
      expect(el.querySelector('.locked .check--locked')).not.toBeNull();
      input.click();
      await fixture.whenStable();
      expect(input.checked).toBe(true);
    });
  });

  describe('Detail row', () => {
    @Component({
      imports: [DetailRowComponent],
      template: `
        <app-detail-row class="plain" label="Baseline" value="77.90" unit="°F" />
        <app-detail-row class="cmp" label="Calculated ILL" value="135.214" compareValue="135.289" unit="in" />
      `,
    })
    class Host {}

    it('renders one value column, or two when comparing', async () => {
      const { el } = await render(Host);
      expect(el.querySelectorAll('.plain .value').length).toBe(1);
      const values = [...el.querySelectorAll('.cmp .value')].map((v) => v.textContent?.trim());
      expect(values).toEqual(['135.214', '135.289']);
      expect(el.querySelector('.cmp .value--compare')).not.toBeNull();
    });
  });

  describe('Series swatch', () => {
    @Component({
      imports: [SeriesSwatchComponent],
      template: `
        <app-series-swatch class="solid" color="#4C8DF6" />
        <app-series-swatch class="dashed" color="#4C8DF6" [dash]="[7, 3]" marker="none" />
      `,
    })
    class Host {}

    it('draws dashes from the palette pattern, and a ring only in ring mode', async () => {
      const { el } = await render(Host);
      expect(el.querySelector('.solid line')!.getAttribute('stroke-dasharray')).toBeNull();
      expect(el.querySelector('.solid circle')).not.toBeNull();
      expect(el.querySelector('.dashed line')!.getAttribute('stroke-dasharray')).toBe('7 3');
      expect(el.querySelector('.dashed circle')).toBeNull();
    });
  });

  describe('VNV form', () => {
    @Component({
      imports: [VnvFormComponent],
      template: '<app-vnv-form [count]="8" (apply)="applied = $event" (cancel)="cancelled = true" />',
    })
    class Host {
      applied: VnvFormValue | null = null;
      cancelled = false;
    }

    it('enables Apply once a QI is chosen and emits the value', async () => {
      const { fixture, el, instance } = await render(Host);
      expect(el.textContent).toContain('8 values selected');
      const apply = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Apply')!;
      expect(apply.disabled).toBe(true);

      const suspect = [...el.querySelectorAll('mat-button-toggle button')].find((b) => b.textContent?.includes('Suspect'))!;
      click(suspect);
      const input = el.querySelector('input') as HTMLInputElement;
      input.value = '  Non pretium ';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(apply.disabled).toBe(false);
      click(apply);
      expect(instance.applied).toEqual({ qi: 'Suspect', comment: 'Non pretium' });
    });

    it('emits cancel', async () => {
      const { el, instance } = await render(Host);
      click([...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancel')!);
      expect(instance.cancelled).toBe(true);
    });
  });

  describe('Date range field', () => {
    @Component({
      imports: [DateRangeFieldComponent],
      template: '<app-date-range-field [(range)]="range" (applied)="applied = $event" />',
    })
    class Host {
      range = signal<DateRangeValue>({ start: new Date(2025, 0, 1).getTime(), end: new Date(2026, 10, 9).getTime() });
      applied: DateRangeValue | null = null;
    }

    it('shows the range and applies edits from the popover', async () => {
      const { fixture, el, instance } = await render(Host);
      expect(el.querySelector('.trigger')!.textContent).toContain('01/01/2025 – 11/09/2026');

      click(el.querySelector('.trigger'));
      await fixture.whenStable();
      const popover = document.querySelector('.cdk-overlay-container .popover')!;
      const [start, end] = popover.querySelectorAll('input');
      const apply = [...popover.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Apply')!;

      end.value = '12/31/2024';
      end.dispatchEvent(new Event('input'));
      end.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(apply.disabled).toBe(true);

      start.value = '07/19/2026';
      start.dispatchEvent(new Event('input'));
      start.dispatchEvent(new Event('change'));
      end.value = '10/19/2026';
      end.dispatchEvent(new Event('input'));
      end.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(apply.disabled).toBe(false);
      click(apply);
      await fixture.whenStable();

      const expected = { start: new Date(2026, 6, 19).getTime(), end: new Date(2026, 9, 19).getTime() };
      expect(instance.applied).toEqual(expected);
      expect(instance.range()).toEqual(expected);
      expect(document.querySelector('.cdk-overlay-container .popover')).toBeNull();
    });
  });
});
