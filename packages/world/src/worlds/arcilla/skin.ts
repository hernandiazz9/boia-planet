import { sharedCoastArt, sharedPlaceAsset } from '../place-art';
import type { PlaceSkinInput, WorldSkinInput } from '../skin';
import { ARCILLA_MAP } from './map';

/**
 * La piel de Arcilla (B05) sobre el mapa compartido (T20): el arte de T18
 * (`art/mundos/arcilla/<lugar>/`, una pieza por lugar del mapa), los nombres
 * propuestos en `mundos/arcilla/diseno.md` y sus bocadillos. Nombres, textos
 * e historia son `muestra` [pendiente Álvaro, P11]. Los secretos y la grada
 * no tienen arte todavía: van con un marcador a propósito.
 */

export const ARCILLA_WORLD_ID = 'arcilla';

/** Bocadillos y textos de Arcilla (mapa.json → `texto` y `encuentro`). */
const SKIN_TEXT: Record<string, PlaceSkinInput> = {
  'puerto-boia': {
    lines: [
      '¡Plop! Bienvenido. Una Boia Fiestera se ha perdido entre cocodrilos: encuéntrala y llévala a la última isla.',
      'Toca en cualquier sitio y arrastra: el barco va hacia donde apuntes.',
      'Por el camino hay monedas, descuentos y algún secreto. Toca para seguir.',
      {
        text: 'Arriba tienes el minimapa: tócalo para ampliar, mantenlo pulsado para moverlo.',
        cue: 'pulse_minimap',
      },
      { text: 'Y en el ancla está el Menú de a bordo. ¡Buen viaje!', cue: 'pulse_menu' },
    ],
  },
  'puerto-whatsapp': {
    texts: {
      title: 'Boia de WhatsApp',
      body: 'Si quieres enterarte antes que nadie de la próxima fiesta, BOIA tiene un grupo de WhatsApp. Es voluntario y puedes salir cuando quieras.',
    },
  },
  cala: {
    texts: {
      kicker: 'Isla',
      body: 'Aquí se coció tu barco. Todavía está caliente. De día la cala cocina; de noche, baila.',
    },
  },
  ultima: {
    texts: {
      kicker: 'Última isla',
      body: 'Aquí la fiesta acaba cuando sale el sol. Quédate un rato: esto no se ve desde la orilla.',
    },
  },
  fotos: {
    texts: { body: 'Todas las fotos de BOIA se revelan aquí. Pasa por el marco y sonríe.' },
  },
  tienda: {
    texts: {
      body: 'Camisetas, tote bags y pegatinas. La tienda de verdad está en tierra; esto es su escaparate.',
    },
  },
  fiestera: {
    lines: [
      '¡Eh, barquito! Estos señores no me dejan ir a la fiesta.',
      '¿Me llevas a la última isla? Te lo pagaré bailando.',
    ],
  },
  naufrago: {
    lines: [
      '¡Llevo tres fiestas esperando aquí! Acércame a una de BOIA y te dejo un regalo.',
      'Arrima el barco al banco de arena y subo de un salto.',
    ],
  },
};

/** Nombres propios de Arcilla (diseno.md → `propuesta_nombre`); las islas de evento no. */
const NAMES: Record<string, string> = {
  puerto: 'El Varadero',
  fiestera: 'El Remanso de los Cocodrilos',
  fotos: 'El Revelado',
  tienda: 'La Botiga',
  ultima: 'Isla del Amanecer',
  circuito: 'El Freu',
};

export const ARCILLA_SKIN: WorldSkinInput = {
  id: ARCILLA_WORLD_ID,
  name: 'Arcilla',
  tagline:
    'Barro cocido en la costa de Alicante: rescata a la Boia Fiestera de los cocodrilos y llévala a la Isla del Amanecer.',
  ship: { style: 'arcilla' },
  sea: { base: '#1a7aa6', wave: '#3aa3c4', crest: '#f4efe6' },
  ui: { accent: '#e43b30' },
  music: null,
  coast: sharedCoastArt(ARCILLA_WORLD_ID),
  places: Object.fromEntries(
    ARCILLA_MAP.places.map((p, i) => [
      p.id,
      {
        asset: sharedPlaceAsset(ARCILLA_WORLD_ID, p.id, i),
        ...SKIN_TEXT[p.id],
      },
    ]),
  ),
  names: NAMES,
};
