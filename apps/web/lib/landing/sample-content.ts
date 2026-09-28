import { homeContentSchema, type HomeContent, type HomeContentInput } from '@boia/contracts';

/**
 * Contenido de MUESTRA de la home hasta que exista la capa de datos (T06) y el
 * Admin (T08). Todo lo que no es textual de la v14 es inventado y está marcado
 * `sample`: eventos, fechas, enlaces de ticketera (sandbox en example.com),
 * enlaces oficiales y correo. Los 26 artistas son la lista provisional de
 * v14 §18.1, textual, sin foto (avatar neutro).
 */

const ARTISTS_V14: ReadonlyArray<[string, string[]]> = [
  ['Alba Fitz', ['Melodic Techno', 'Downtempo']],
  ['Amenaza Verde', ['Cumbia']],
  ['Casta Diva', ['Hip Hop']],
  ['DJ Alpina', ['Electro', 'Techno']],
  ['DJ Sacred', ['Techno']],
  ['EGFNK', ['House']],
  ['Franco Maltratto', ['Reggaeton', 'House']],
  ['Koko Moreno', ['Reggaeton', 'House', 'Hard Dance']],
  ['Las Precarias de Torrevieja', ['Techno', 'Hard Dance']],
  ['Latin Master X', ['House']],
  ['Manija', ['Melodic Techno', 'Techno', 'Psytrance']],
  ['Marabina', ['Ambient', 'Experimental']],
  ['Moglia (Live)', ['Hip Hop', 'Jazz Fusion']],
  ['Nacho Age', ['House']],
  ['Nat', ['House']],
  ['Pollo Can Fly', ['Hard Dance', 'Hard Trance']],
  ['The Rancho Cashmere Band', ['Country']],
  ['RBS', ['Techno']],
  ['RKVX', ['Techno']],
  ['Soviet Gym', ['House']],
  ['Spowy', ['House']],
  ['Stonzze', ['Hard Bounce', 'Hard Trance']],
  ['Tere Ling', ['Hard Bounce', 'Hard Groove', 'Hard Trance']],
  ['Tonitto', ['Reggaeton', 'Hip Hop']],
  ['Torvik', ['Tech House']],
  ['Wet Kisses', ['Trance']],
];

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SANDBOX = 'https://example.com/boia-sandbox';

const input: HomeContentInput = {
  blocks: [
    {
      id: 'hero',
      type: 'hero',
      visible: true,
      title: 'BOIA UNDERGROUND MUSIC FESTIVAL',
      // §37.11, frase de trabajo. [pendiente Álvaro]
      positioning: 'Música sin un único género. Cultura sin un único formato.',
    },
    { id: 'priority', type: 'priority_event', visible: true, eventId: 'ev-all-day-primavera' },
    { id: 'upcoming', type: 'upcoming_events', visible: true, limit: 6 },
    { id: 'photos', type: 'photos', visible: true, albumId: 'album-muestra', limit: 6 },
    { id: 'artists', type: 'artists', visible: true, rotationMs: 5000 },
    {
      id: 'philosophy',
      type: 'philosophy',
      visible: true,
      // Versión breve a partir de §37 (docs/spec/10-filosofia.md). [pendiente Álvaro]
      paragraphs: [
        'BOIA nace en Alicante para dar espacio a lo que merece ser descubierto: nuevos DJs, productores, directos y proyectos que no encajan en una escena de club segmentada por géneros.',
        'No vienes simplemente a BOIA. Formas parte de BOIA.',
      ],
      verbs: [
        { verb: 'Dar espacio', text: 'A artistas, proyectos, ideas y personas.' },
        { verb: 'Descubrir', text: 'Música, cultura, personas y cosas que no esperabas.' },
        { verb: 'Pertenecer', text: 'Formar parte de una comunidad, no mirarla desde fuera.' },
      ],
    },
    {
      id: 'store',
      type: 'store',
      visible: true,
      url: `${SANDBOX}/tienda`,
      products: ['Camisetas', 'Tote bags', 'Packs de pegatinas'],
    },
    {
      id: 'contact',
      type: 'contact',
      visible: true,
      email: 'hola@example.com',
      links: [{ label: 'WhatsApp', url: `${SANDBOX}/whatsapp` }],
    },
    {
      id: 'footer',
      type: 'footer',
      visible: true,
      officialLinks: [
        { label: 'Instagram', url: `${SANDBOX}/instagram` },
        { label: 'TikTok', url: `${SANDBOX}/tiktok` },
      ],
    },
  ],
  events: [
    {
      id: 'ev-all-day-primavera',
      slug: 'all-day-boia-primavera-2027',
      name: 'All Day BOIA · Primavera',
      format: 'All Day BOIA',
      startsAt: '2027-04-17T12:00:00+02:00',
      timeZone: 'Europe/Madrid',
      placeLabel: 'Alicante · ubicación secreta',
      state: 'on_sale',
      description: 'Un día entero de música sin un único género, comida, actividades y sorpresas.',
      artistIds: ['alba-fitz', 'amenaza-verde', 'casta-diva', 'manija', 'marabina'],
      ticketUrl: `${SANDBOX}/tickets/all-day-boia-primavera-2027`,
      islandId: 'isla-primavera',
      sample: true,
    },
    {
      id: 'ev-noche-mayo',
      slug: 'boia-noche-mayo-2027',
      name: 'BOIA Noche · Mayo',
      format: 'Noche',
      startsAt: '2027-05-22T23:00:00+02:00',
      timeZone: 'Europe/Madrid',
      placeLabel: 'Alicante',
      state: 'on_sale',
      description: 'Una noche larga con cabina abierta a propuestas nuevas.',
      artistIds: ['rbs', 'rkvx', 'tere-ling'],
      ticketUrl: `${SANDBOX}/tickets/boia-noche-mayo-2027`,
      sample: true,
    },
    {
      id: 'ev-all-day-verano',
      slug: 'all-day-boia-verano-2027',
      name: 'All Day BOIA · Verano',
      format: 'All Day BOIA',
      startsAt: '2027-07-10T12:00:00+02:00',
      timeZone: 'Europe/Madrid',
      placeLabel: 'Alicante · ubicación secreta',
      state: 'coming_soon',
      description: 'El siguiente All Day BOIA. Cartel por anunciar.',
      artistIds: [],
      islandId: 'isla-verano',
      sample: true,
    },
    {
      id: 'ev-borrador',
      slug: 'borrador',
      name: 'Evento en borrador',
      format: 'Noche',
      startsAt: '2027-09-01T23:00:00+02:00',
      timeZone: 'Europe/Madrid',
      placeLabel: 'Alicante',
      state: 'draft',
      description: 'No debe aparecer en la home.',
      artistIds: [],
      sample: true,
    },
    {
      id: 'ev-finalizado',
      slug: 'all-day-boia-2026',
      name: 'All Day BOIA 2026',
      format: 'All Day BOIA',
      startsAt: '2026-06-20T12:00:00+02:00',
      timeZone: 'Europe/Madrid',
      placeLabel: 'Alicante',
      state: 'finished',
      description: 'Ya pasó: vive en el archivo y en su isla.',
      artistIds: [],
      sample: true,
    },
  ],
  artists: ARTISTS_V14.map(([name, genres]) => ({ id: slug(name), name, genres })),
  photos: Array.from({ length: 6 }, (_, i) => ({
    id: `foto-${i + 1}`,
    albumId: 'album-muestra',
    alt: `Foto de muestra ${i + 1} de un All Day BOIA`,
    width: 4,
    height: 3,
  })),
  promotions: [],
};

export const SAMPLE_CONTENT: HomeContent = homeContentSchema.parse(input);
