/** Shared mark SVG for AppIcon / OG icon / apple-touch (viewBox 0 0 32 32). */
export const APP_ICON_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="11" stroke="#fafafa" stroke-width="2.25" stroke-opacity="0.35"/>
  <path d="M10 14.5c1.2-3.2 4.2-5.2 7.6-5.2 3.8 0 6.9 2.4 7.9 5.6" stroke="#fafafa" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M23.8 12.2 26 15.8 22.2 16.6" stroke="#fafafa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 17.5c-1.2 3.2-4.2 5.2-7.6 5.2-3.8 0-6.9-2.4-7.9-5.6" stroke="#fafafa" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M8.2 19.8 6 16.2 9.8 15.4" stroke="#fafafa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function appIconMarkDataUri(): string {
  return `data:image/svg+xml;base64,${Buffer.from(APP_ICON_MARK_SVG).toString("base64")}`;
}
