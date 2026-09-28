import { DEFAULT_KEYBOARD_MODE, type KeyboardMode, isKeyboardMode } from '../input/controls';
import type { KeyValueStore } from './storage';

/**
 * Ajustes del jugador (§20, REQ-IDE-037) y modo del teclado (D-14). Se
 * guardan en el dispositivo; con cuenta irán al perfil (fuera de T05).
 */
export interface AudioChannel {
  enabled: boolean;
  /** 0..1 */
  volume: number;
}

/** L1 sólo publica español (D-03); el inglés llega en L2 (REQ-ARQ-021). */
export const LANGUAGES = [
  { id: 'es', label: 'Español', available: true },
  { id: 'en', label: 'English', available: false },
] as const;
export type Language = (typeof LANGUAGES)[number]['id'];

export interface Settings {
  language: Language;
  /** Música y efectos van por separado: los efectos siguen aunque se calle la música. */
  music: AudioChannel;
  sfx: AudioChannel;
  keyboardMode: KeyboardMode;
}

export const SETTINGS_KEY = 'boia.ajustes';

export const DEFAULT_SETTINGS: Settings = {
  language: 'es',
  music: { enabled: true, volume: 0.6 },
  sfx: { enabled: true, volume: 0.8 },
  keyboardMode: DEFAULT_KEYBOARD_MODE,
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function channel(raw: unknown, fallback: AudioChannel): AudioChannel {
  if (!isObj(raw)) return { ...fallback };
  const volume =
    typeof raw.volume === 'number' && Number.isFinite(raw.volume)
      ? Math.min(1, Math.max(0, raw.volume))
      : fallback.volume;
  return { enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled, volume };
}

/**
 * Lee ajustes guardados con tolerancia: cada campo inválido o ausente toma su
 * valor por defecto, sin tirar el resto (una versión vieja no borra nada).
 */
export function parseSettings(raw: unknown): Settings {
  if (!isObj(raw)) return structuredClone(DEFAULT_SETTINGS);
  const language = LANGUAGES.find((l) => l.available && l.id === raw.language)?.id;
  return {
    language: language ?? DEFAULT_SETTINGS.language,
    music: channel(raw.music, DEFAULT_SETTINGS.music),
    sfx: channel(raw.sfx, DEFAULT_SETTINGS.sfx),
    keyboardMode: isKeyboardMode(raw.keyboardMode)
      ? raw.keyboardMode
      : DEFAULT_SETTINGS.keyboardMode,
  };
}

export function loadSettings(store: KeyValueStore): Settings {
  const text = store.getItem(SETTINGS_KEY);
  if (!text) return structuredClone(DEFAULT_SETTINGS);
  try {
    return parseSettings(JSON.parse(text));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(store: KeyValueStore, s: Settings): void {
  store.setItem(SETTINGS_KEY, JSON.stringify(parseSettings(s)));
}

/** Volumen efectivo de un canal (0 si está desactivado). */
export function channelGain(c: AudioChannel): number {
  return c.enabled ? c.volume : 0;
}
