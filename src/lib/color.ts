/** Relative luminance of a #rrggbb colour (WCAG 2.x). */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on top of `hex`. */
export function readableForeground(hex: string): "#000000" | "#ffffff" {
  const l = relativeLuminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastBlack = (l + 0.05) / 0.05;
  return contrastBlack > contrastWhite ? "#000000" : "#ffffff";
}

/** CSS custom properties that re-theme a subtree with a school's brand colour. */
export function brandStyle(hex: string | null | undefined): Record<string, string> | undefined {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  const foreground = readableForeground(hex);
  return {
    "--primary": hex,
    "--primary-foreground": foreground,
    "--ring": `${hex}99`,
    "--sidebar-primary": hex,
    "--sidebar-primary-foreground": foreground,
  };
}
