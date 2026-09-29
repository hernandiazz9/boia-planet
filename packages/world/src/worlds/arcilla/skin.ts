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

const art = (place: string, part = place, variant?: string) =>
  `mundos/arcilla/${place}#${part}${variant ? `@${variant}` : ''}`;

/** Pieza de arte de cada lugar del mapa (los que siguen un patrón, abajo). */
const PARTS: Record<string, string> = {
  puerto: art('puerto'),
  'puerto-anillo': art('puerto', 'anillo'),
  'puerto-escollera_oeste': art('puerto', 'escollera_oeste'),
  'puerto-escollera_este': art('puerto', 'escollera_este'),
  'puerto-baliza_verde': art('puerto', 'baliza_verde'),
  'puerto-baliza_roja': art('puerto', 'baliza_roja'),
  'puerto-boia': art('puerto', 'boia'),
  'puerto-whatsapp': art('puerto', 'whatsapp'),
  cala: art('cala'),
  allday: art('allday', 'allday', 'venta'),
  fotos: art('fotos'),
  tienda: art('tienda'),
  ultima: art('ultima'),
  faro: art('faro'),
  canon: art('canon'),
  fiestera: art('fiestera'),
  'fiestera-posidonia': art('fiestera', 'posidonia'),
  naufrago: art('naufrago'),
  delfin: art('delfin'),
  remolino: art('remolino'),
  circuito: art('circuito', 'salida'),
  'circuito-cp1': art('circuito', 'cp1'),
  'circuito-cp-s': art('circuito', 'cp-s'),
  'circuito-cp-a': art('circuito', 'cp-a'),
  'circuito-cp2': art('circuito', 'cp2'),
  'circuito-meta': art('circuito', 'meta'),
  'circuito-semaforo': art('circuito', 'semaforo'),
  'circuito-cartel': art('circuito', 'cartel'),
  'circuito-dents': art('circuito', 'dents'),
  'circuito-freu': art('circuito', 'freu'),
  'circuito-roca': art('circuito', 'roca'),
  'circuito-medusa': art('circuito', 'medusa'),
  'circuito-cocodrilo': art('circuito', 'cocodrilo', 'derecha'),
};

const RESTOS_VARIANTS = ['a', 'b', 'c'];

/** El asset de un lugar del mapa en Arcilla (o un marcador si T18 no le dio arte). */
function assetFor(id: string, i: number): string {
  if (PARTS[id]) return PARTS[id];
  let m = /^fiestera-(cocodrilo|roca)_(\d)$/.exec(id);
  if (m) return art('fiestera', `${m[1]}_${m[2]}`);
  m = /^restos-(\d+)$/.exec(id);
  if (m) return art('restos', 'restos', RESTOS_VARIANTS[Number(m[1]) % RESTOS_VARIANTS.length]);
  if (id.startsWith('cofre-')) return art('cofres', 'cofre');
  if (id.startsWith('circuito-carril-')) return art('circuito', 'boia_carril', i % 2 ? 'b' : 'a');
  if (id.startsWith('secreto-')) return 'placeholder:secreto';
  throw new Error(`Arcilla: lugar sin arte asignado: ${id}`);
}

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
  coast: {
    west: art('costa_oeste'),
    east: art('costa_este'),
    south: art('costa_sur'),
    cornerWest: art('costa_sur', 'esquina_oeste'),
    cornerEast: art('costa_sur', 'esquina_este'),
  },
  places: Object.fromEntries(
    ARCILLA_MAP.places.map((p, i) => [p.id, { asset: assetFor(p.id, i), ...SKIN_TEXT[p.id] }]),
  ),
  names: NAMES,
};

/**
 * Mundo `prueba` sobre el mismo mapa: el arte de Arcilla con otro barco,
 * otro mar y otros nombres. Sólo sirve para probar el cambio de mundo hasta
 * que T24 ponga Acuarela.
 */
export const PRUEBA_SKIN_ARCILLA: WorldSkinInput = {
  ...ARCILLA_SKIN,
  id: 'prueba',
  name: 'Prueba',
  tagline: 'Mundo de prueba: los mismos lugares con otra piel.',
  ship: { style: 'acuarela' },
  sea: { base: '#1d4f6e', wave: '#4d8fb5', crest: '#f4ead8' },
  ui: { accent: '#3f7fbf' },
  names: { puerto: 'Puerto de prueba', cala: 'Islote de prueba' },
  // Otra variante del arte en algunos lugares, para ver el cambio.
  places: {
    ...ARCILLA_SKIN.places,
    allday: { asset: art('allday', 'allday', 'recuerdo') },
    'circuito-cocodrilo': { asset: art('circuito', 'cocodrilo', 'izquierda') },
  },
};
