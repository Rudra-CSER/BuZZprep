/** Profile and server settings. */

export const WORK_PRESSURES = ['low', 'moderate', 'high'] as const;
export type WorkPressure = (typeof WORK_PRESSURES)[number];

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const REGISTRATION_MODES = ['open', 'invite', 'closed'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];
