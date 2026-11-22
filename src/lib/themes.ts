export type ThemeId =
  | 'teal'
  | 'navy'
  | 'forest'
  | 'wine'
  | 'slate'
  | 'indigo'
  | 'copper'
  | 'ocean';

export type ThemePalette = {
  id: ThemeId;
  label: string;
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  support: string;
};

export const THEMES: ThemePalette[] = [
  {
    id: 'teal',
    label: 'Teal',
    primary: '#0f766e',
    primaryDark: '#0d9488',
    primaryDeep: '#0b5550',
    support: '#ccfbf1',
  },
  {
    id: 'navy',
    label: 'Navy',
    primary: '#1e3a5f',
    primaryDark: '#2a4a73',
    primaryDeep: '#152a45',
    support: '#dbe7f3',
  },
  {
    id: 'forest',
    label: 'Forest',
    primary: '#3f6212',
    primaryDark: '#4d7c0f',
    primaryDeep: '#2d4a0e',
    support: '#ecfccb',
  },
  {
    id: 'wine',
    label: 'Wine',
    primary: '#7f1d1d',
    primaryDark: '#991b1b',
    primaryDeep: '#5c1414',
    support: '#fee2e2',
  },
  {
    id: 'slate',
    label: 'Slate',
    primary: '#334155',
    primaryDark: '#475569',
    primaryDeep: '#1e293b',
    support: '#e2e8f0',
  },
  {
    id: 'indigo',
    label: 'Indigo',
    primary: '#3730a3',
    primaryDark: '#4338ca',
    primaryDeep: '#2e1065',
    support: '#e0e7ff',
  },
  {
    id: 'copper',
    label: 'Copper',
    primary: '#9a3412',
    primaryDark: '#c2410c',
    primaryDeep: '#7c2d12',
    support: '#ffedd5',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    primary: '#1d4ed8',
    primaryDark: '#2563eb',
    primaryDeep: '#1e3a8a',
    support: '#dbeafe',
  },
];

export const DEFAULT_THEME: ThemeId = 'teal';

export function themeById(id?: string | null): ThemePalette {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export function applyTheme(id?: string | null) {
  const theme = themeById(id);
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-dark', theme.primaryDark);
  root.style.setProperty('--color-primary-deep', theme.primaryDeep);
  root.style.setProperty('--color-support', theme.support);
  root.dataset.theme = theme.id;
}

export function resetTheme() {
  applyTheme(DEFAULT_THEME);
}
