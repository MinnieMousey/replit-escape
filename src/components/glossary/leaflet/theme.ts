// ── Theme presets for the Leaflet route planner ─────────────────────────────
// Two complete looks: the dark AIS overlay (default) and a SkyVector-bright
// chart theme that swaps tiles and accent colours.

export type PlannerTheme = 'dark' | 'skyvector';

export interface ThemeTokens {
  tileUrl: string;
  tileAttribution: string;
  accent: string;       // primary stroke / marker
  routeStroke: string;  // dashed great-circle line
  panelBg: string;      // sidebar background
  panelBorder: string;
  panelText: string;
  panelMuted: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
}

export const THEMES: Record<PlannerTheme, ThemeTokens> = {
  dark: {
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; OpenStreetMap &copy; CARTO',
    accent: '#7dd3fc',
    routeStroke: '#38bdf8',
    panelBg: 'rgba(2, 6, 23, 0.92)',
    panelBorder: 'rgba(148, 163, 184, 0.25)',
    panelText: '#e2e8f0',
    panelMuted: 'rgba(226, 232, 240, 0.55)',
    inputBg: 'rgba(15, 23, 42, 0.85)',
    inputBorder: 'rgba(148, 163, 184, 0.3)',
    inputText: '#e2e8f0',
  },
  skyvector: {
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; OpenStreetMap &copy; CARTO',
    accent: '#1f8fff',
    routeStroke: '#0b5fbf',
    panelBg: 'rgba(248, 250, 252, 0.96)',
    panelBorder: 'rgba(31, 143, 255, 0.35)',
    panelText: '#0f172a',
    panelMuted: 'rgba(15, 23, 42, 0.6)',
    inputBg: '#ffffff',
    inputBorder: 'rgba(31, 143, 255, 0.4)',
    inputText: '#0f172a',
  },
};
