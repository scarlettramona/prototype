import { describe, expect, it } from 'vitest';
import {
  getThemeStyles,
  isAccentColor,
  isSemanticColor,
  normalizeMaxWidth,
  resolveLozengeColor,
} from './lozenge.utils';

describe('lozenge.utils', () => {
  describe('isAccentColor / isSemanticColor', () => {
    it('classifies accent and semantic values', () => {
      expect(isAccentColor('accent-red')).toBe(true);
      expect(isAccentColor('success')).toBe(false);
      expect(isSemanticColor('success')).toBe(true);
      expect(isSemanticColor('accent-red')).toBe(false);
    });

    it('treats null/undefined/unknown as neither', () => {
      for (const v of [null, undefined, '', 'bogus'] as const) {
        expect(isAccentColor(v)).toBe(false);
        expect(isSemanticColor(v)).toBe(false);
      }
    });
  });

  describe('resolveLozengeColor', () => {
    it('passes accent colors through unchanged', () => {
      expect(resolveLozengeColor('accent-blue')).toBe('accent-blue');
    });

    it('maps legacy appearances onto canonical semantic colors', () => {
      expect(resolveLozengeColor('inprogress')).toBe('information');
      expect(resolveLozengeColor('moved')).toBe('warning');
      expect(resolveLozengeColor('removed')).toBe('danger');
      expect(resolveLozengeColor('default')).toBe('neutral');
    });

    it('falls back to neutral for unknown / nullish values', () => {
      expect(resolveLozengeColor('bogus' as never)).toBe('neutral');
      expect(resolveLozengeColor(null)).toBe('neutral');
      expect(resolveLozengeColor(undefined)).toBe('neutral');
    });
  });

  describe('getThemeStyles', () => {
    it('splits accent colors into category + bare key', () => {
      expect(getThemeStyles('accent-red')).toEqual({ category: 'accent', key: 'red' });
    });

    it('keeps semantic colors as the key', () => {
      expect(getThemeStyles('success')).toEqual({ category: 'semantic', key: 'success' });
    });
  });

  describe('normalizeMaxWidth', () => {
    it('defaults to 200px when nullish', () => {
      expect(normalizeMaxWidth(undefined)).toEqual({ value: '200px', isPercent: false });
    });

    it('treats numbers as pixels', () => {
      expect(normalizeMaxWidth(120)).toEqual({ value: '120px', isPercent: false });
    });

    it('detects percentage strings', () => {
      expect(normalizeMaxWidth('50%')).toEqual({ value: '50%', isPercent: true });
      expect(normalizeMaxWidth('10rem')).toEqual({ value: '10rem', isPercent: false });
    });
  });
});
