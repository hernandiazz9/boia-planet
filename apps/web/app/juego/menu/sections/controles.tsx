import {
  type ControlSensitivity,
  KEYBOARD_MODES,
  type KeyboardMode,
  type MinimapZone,
  SENSITIVITY_RANGE,
} from '@boia/engine/ui';
import type { MenuSection } from '../types';

const MODE_LABEL: Record<KeyboardMode, { title: string; help: string }> = {
  screen: {
    title: 'Dirección de pantalla',
    help: 'Flecha arriba lleva el barco hacia arriba, como el joystick. Recomendado.',
  },
  tank: {
    title: 'Control de tanque',
    help: 'Arriba acelera; izquierda y derecha giran el barco; abajo suelta.',
  },
};

const SENSITIVITY_LABEL: Record<keyof ControlSensitivity, string> = {
  keyboard: 'Teclado',
  touch: 'Táctil',
};

const ZONE_LABEL: Record<MinimapZone, string> = {
  'top-right': 'Arriba a la derecha',
  'top-left': 'Arriba a la izquierda',
  'middle-right': 'En medio, a la derecha',
  'middle-left': 'En medio, a la izquierda',
};

/** 🎮 Controles (REQ-IDE-036) y modo del teclado (D-14, REQ-MUN-008). */
export const controlesSection: MenuSection = {
  id: 'controles',
  icon: '🎮',
  label: 'Controles',
  group: 'tools',
  Component: function Controles({ ctx }) {
    return (
      <>
        <h3>Navegar</h3>
        <ul>
          <li>Toca en cualquier sitio y arrastra: el barco va hacia donde apuntes.</li>
          <li>
            <strong>Drift:</strong> con un segundo dedo apoyado (o Shift en el teclado) el barco
            derrapa y gira más cerrado.
          </li>
          <li>En el ordenador: flechas o WASD.</li>
        </ul>

        <fieldset className="juego-field" data-testid="modo-teclado">
          <legend>Teclado</legend>
          {KEYBOARD_MODES.map((m) => (
            <label key={m} className="juego-choice">
              <input
                type="radio"
                name="modo-teclado"
                value={m}
                checked={ctx.settings.keyboardMode === m}
                onChange={() => ctx.updateSettings((s) => ({ ...s, keyboardMode: m }))}
              />
              <span>
                <strong>{MODE_LABEL[m].title}</strong>
                <br />
                <small>{MODE_LABEL[m].help}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="juego-field" data-testid="sensibilidad">
          <legend>Sensibilidad del giro</legend>
          {(Object.keys(SENSITIVITY_LABEL) as (keyof ControlSensitivity)[]).map((k) => (
            <label key={k} className="juego-range">
              <span>
                {SENSITIVITY_LABEL[k]} · {Math.round(ctx.settings.sensitivity[k] * 100)} %
              </span>
              <input
                type="range"
                min={Math.round(SENSITIVITY_RANGE.min * 100)}
                max={Math.round(SENSITIVITY_RANGE.max * 100)}
                step={Math.round(SENSITIVITY_RANGE.step * 100)}
                value={Math.round(ctx.settings.sensitivity[k] * 100)}
                aria-label={`Sensibilidad del giro: ${SENSITIVITY_LABEL[k].toLowerCase()}`}
                onChange={(e) =>
                  ctx.updateSettings((s) => ({
                    ...s,
                    sensitivity: { ...s.sensitivity, [k]: Number(e.target.value) / 100 },
                  }))
                }
              />
            </label>
          ))}
          <small>Más, el barco gira antes; menos, gira más suave.</small>
        </fieldset>

        <h3>Minimapa y brújula</h3>
        <ul>
          <li>Toca el minimapa para ampliarlo y ver los nombres de lo que has descubierto.</li>
          <li>Mantenlo pulsado medio segundo y arrástralo para cambiarlo de sitio.</li>
          <li>La brújula señala lo siguiente sin explorar, o el sitio que elijas en el mapa.</li>
        </ul>
        <label className="juego-field">
          <span>Sitio del minimapa</span>
          <select
            value={ctx.minimapZone}
            onChange={(e) => ctx.setMinimapZone(e.target.value as MinimapZone)}
          >
            {ctx.minimapZones.map((z) => (
              <option key={z} value={z}>
                {ZONE_LABEL[z]}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  },
};
