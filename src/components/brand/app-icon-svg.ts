/** Shared mark paths (viewBox 0 0 32 32). Clear facing relay arrows — not an S blob. */
export const APP_ICON_MARK_INNER = `
  <circle cx="16" cy="16" r="12" fill="none" stroke="#fafafa" stroke-width="1.5" stroke-opacity="0.3"/>
  <!-- upper arc → right arrowhead -->
  <path d="M8.5 13.2 A8.2 8.2 0 0 1 23.5 13.2" fill="none" stroke="#fafafa" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M21.2 10.4 L25.4 13.6 L20.8 15.5 Z" fill="#fafafa"/>
  <!-- lower arc → left arrowhead -->
  <path d="M23.5 18.8 A8.2 8.2 0 0 1 8.5 18.8" fill="none" stroke="#fafafa" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M10.8 21.6 L6.6 18.4 L11.2 16.5 Z" fill="#fafafa"/>
`.trim();

export const APP_ICON_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${APP_ICON_MARK_INNER}</svg>`;

/** Full-bleed home-screen asset (square; OS applies mask). */
export function appIconRasterSvg(size: number): string {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#262626"/>
  <svg x="${pad}" y="${pad}" width="${inner}" height="${inner}" viewBox="0 0 32 32" fill="none">
    ${APP_ICON_MARK_INNER}
  </svg>
</svg>`;
}

export function appIconMarkDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(APP_ICON_MARK_SVG).toString("base64")}`;
}
