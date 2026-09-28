import { type AudioChannel, LANGUAGES, type Language, type Settings } from '@boia/engine/ui';
import type { MenuSection } from '../types';

function ChannelControl({
  id,
  label,
  onLabel,
  value,
  onChange,
}: {
  id: 'music' | 'sfx';
  label: string;
  onLabel: string;
  value: AudioChannel;
  onChange: (c: AudioChannel) => void;
}) {
  return (
    <fieldset className="juego-field" data-testid={`ajuste-${id}`}>
      <legend>{label}</legend>
      <label className="juego-choice">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        <span>{onLabel}</span>
      </label>
      <label className="juego-range">
        <span>Volumen</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(value.volume * 100)}
          disabled={!value.enabled}
          aria-label={`Volumen de ${label.toLowerCase()}`}
          onChange={(e) => onChange({ ...value, volume: Number(e.target.value) / 100 })}
        />
      </label>
    </fieldset>
  );
}

/** ⚙ Ajustes (§20, REQ-IDE-037): idioma, música y efectos por separado; se guardan. */
export const ajustesSection: MenuSection = {
  id: 'ajustes',
  icon: '⚙️',
  label: 'Ajustes',
  group: 'tools',
  Component: function Ajustes({ ctx }) {
    const set = (patch: Partial<Settings>) => ctx.updateSettings((s) => ({ ...s, ...patch }));
    return (
      <>
        <label className="juego-field">
          <span>Idioma</span>
          <select
            value={ctx.settings.language}
            onChange={(e) => set({ language: e.target.value as Language })}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} disabled={!l.available}>
                {l.label}
                {l.available ? '' : ' (próximamente)'}
              </option>
            ))}
          </select>
        </label>
        <ChannelControl
          id="music"
          label="Música"
          onLabel="Activada"
          value={ctx.settings.music}
          onChange={(music) => set({ music })}
        />
        <ChannelControl
          id="sfx"
          label="Efectos de sonido"
          onLabel="Activados"
          value={ctx.settings.sfx}
          onChange={(sfx) => set({ sfx })}
        />
        <p className="juego-muted">
          Los efectos siguen sonando aunque quites la música. Todo se guarda en este dispositivo.
        </p>
      </>
    );
  },
};
