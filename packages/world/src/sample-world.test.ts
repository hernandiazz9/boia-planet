import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { artFrames, parseArtManifest } from './art';
import { SAMPLE_WORLD } from './sample-world';
import { parseWorldConfig } from './schema';

const ART = fileURLToPath(new URL('../../../art/', import.meta.url));
const world = parseWorldConfig(SAMPLE_WORLD);

function manifest(id: string) {
  const r = parseArtManifest(JSON.parse(readFileSync(`${ART}${id}/manifest.json`, 'utf8')));
  if (!r.ok) throw new Error(`${id}: ${r.error}`);
  return r.manifest;
}

describe('mundo de muestra de la demo L1', () => {
  it('cumple el esquema y cada asset existe en art/ con sus imágenes', () => {
    const ids = new Set([...world.objects.map((o) => o.appearance.asset), world.coast!.asset]);
    for (const id of ids) {
      const m = manifest(id);
      const files =
        m.kind === 'tile'
          ? Object.values(m.tile!.variants).map((v) => v.file)
          : artFrames(m, 'idle').files;
      expect(files.length, id).toBeGreaterThan(0);
      for (const f of files) expect(existsSync(`${ART}${id}/${f}`), `${id}/${f}`).toBe(true);
    }
  });

  it('la boia tutorial es lo primero que hay al salir, dentro de su radio de habla', () => {
    const spawn = world.spawn!;
    const byDistance = [...world.objects].sort(
      (a, b) =>
        Math.hypot(a.position.x - spawn.x, a.position.y - spawn.y) -
        Math.hypot(b.position.x - spawn.x, b.position.y - spawn.y),
    );
    const first = byDistance[0]!;
    expect(first.appearance.asset).toBe('boia-tutorial');
    // Delante del barco (norte) y a menos de un segundo de navegación del radio.
    expect(first.position.y).toBeLessThan(spawn.y);
    const dialogue = first.behaviors.find((b) => b.type === 'dialogue');
    expect(dialogue?.type === 'dialogue' && dialogue.params.lines.length).toBeGreaterThan(0);
    const cues = dialogue?.type === 'dialogue' ? dialogue.params.lines.map((l) => l.cue) : [];
    expect(cues).toContain('pulse_menu');
    expect(cues).toContain('pulse_minimap');
    // El tutorial cierra señalando el menú (REQ-AVE-004).
    expect(cues.at(-1)).toBe('pulse_menu');
  });

  it('la isla de evento se activa con un radio amplio: más del doble de su costa', () => {
    const isla = world.objects.find((o) => o.appearance.asset === 'isla-evento')!;
    // En el arte, la sugerencia de proximidad es ~1,8 veces la huella; aquí más.
    const m = manifest('isla-evento');
    const hint = m.proximity_hint!.radius_px / m.hitbox_hint!.radius_px;
    const ratio = isla.geometry.proximityRadius! / isla.geometry.collision!.radius;
    expect(ratio).toBeGreaterThan(hint);
    expect(ratio).toBeGreaterThan(2);
    const types = isla.behaviors.map((b) => b.type);
    expect(types).toEqual(expect.arrayContaining(['proximity', 'content', 'ticket', 'collision']));
  });

  it('las rocas son obstáculos y las costas están a ambos lados', () => {
    const rocks = world.objects.filter((o) => o.identity.category === 'obstaculo');
    expect(rocks.length).toBeGreaterThan(1);
    for (const r of rocks) expect(r.behaviors.some((b) => b.type === 'collision')).toBe(true);
    const sides = Object.values(manifest(world.coast!.asset).tile!.variants).map(
      (v) => v.land_side,
    );
    expect(sides.sort()).toEqual(['left', 'right']);
  });

  it('ningún objeto queda fuera del mar navegable', () => {
    const b = world.bounds;
    for (const o of world.objects) {
      const r = o.geometry.collision?.radius ?? 0;
      expect(o.position.x - r, o.identity.id).toBeGreaterThan(b.left);
      expect(o.position.x + r, o.identity.id).toBeLessThan(b.right);
      expect(o.position.y + r, o.identity.id).toBeLessThan(b.bottom);
    }
  });
});
