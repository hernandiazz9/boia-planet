import { describe, expect, it } from 'vitest';
import { DIRECTIONS } from './direction';
import { findShipImage, parseShipManifest } from './manifest';

const anchor = {
  pivot: [128, 180],
  mast_top: [128, 40],
  slot_passenger: [120, 150],
  wake_origin: [150, 175],
};

function images(withAnchors: boolean) {
  return ['base', 'noche'].flatMap((skin) =>
    DIRECTIONS.flatMap((direction) =>
      [false, true].map((passenger) => ({
        file: `${skin}/${direction}${passenger ? '_p' : ''}.png`,
        skin,
        direction,
        frame: 0,
        passenger,
        ...(withAnchors ? anchor : {}),
      })),
    ),
  );
}

describe('manifiesto del barco', () => {
  it('lee anclajes por dirección en la raíz', () => {
    const r = parseShipManifest({
      id: 'barco',
      version: 1,
      license: 'muestra interna',
      images: images(false),
      anchors: Object.fromEntries(DIRECTIONS.map((d) => [d, anchor])),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifest.anchors.N.pivot).toEqual({ x: 128, y: 180 });
    expect(findShipImage(r.manifest, 'noche', 'NE', true)?.file).toBe('noche/NE_p.png');
  });

  it('lee anclajes en directions.<D>.anchors, con bow opcional', () => {
    const r = parseShipManifest({
      id: 'barco',
      version: '0.1.0',
      license: 'muestra interna',
      images: images(false),
      directions: Object.fromEntries(
        DIRECTIONS.map((d) => [d, { yaw_deg: 0, anchors: { ...anchor, bow: [60, 192] } }]),
      ),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manifest.anchors.W.bow).toEqual({ x: 60, y: 192 });
  });

  it('lee anclajes dentro de cada imagen', () => {
    const r = parseShipManifest({ id: 'barco', version: '1', license: 'x', images: images(true) });
    expect(r.ok).toBe(true);
  });

  it('rechaza un manifiesto sin anclajes de alguna dirección', () => {
    const r = parseShipManifest({
      id: 'barco',
      version: 1,
      license: 'x',
      images: images(false),
      anchors: { S: anchor },
    });
    expect(r).toMatchObject({ ok: false });
  });
});
