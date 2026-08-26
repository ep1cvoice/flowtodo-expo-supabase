export function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function categoryFadeColors(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return [`rgba(${r},${g},${b},0)`, `rgba(${r},${g},${b},0.3)`] as const;
}
