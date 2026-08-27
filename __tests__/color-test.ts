import { categoryFadeColors, hexToRgb } from '@/lib/color';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
  });

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#0d8')).toEqual({ r: 0, g: 221, b: 136 });
  });
});

describe('categoryFadeColors', () => {
  it('builds transparent-to-30% rgba pair', () => {
    expect(categoryFadeColors('#ff0000')).toEqual(['rgba(255,0,0,0)', 'rgba(255,0,0,0.3)']);
  });
});
