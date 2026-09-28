import type { MenuSection } from '../types';

/** ⚓ Welcome Aboard (REQ-IDE-035): consultable; el tutorial nunca la abre solo. Borrador. */
export const welcomeSection: MenuSection = {
  id: 'welcome',
  icon: '⚓',
  label: 'Welcome Aboard',
  group: 'progress',
  Component: function Welcome() {
    return (
      <>
        <p>
          BOIA.PLANET es el universo de BOIA: un mar con islas de eventos, secretos, descuentos
          escondidos y la Boia Fiestera esperando a que la encuentres.
        </p>
        <p>
          <strong>Tu objetivo:</strong> encontrar a la Boia Fiestera y llevarla hasta la última
          isla. Por el camino, descubre islas y consigue logros.
        </p>
        <ul>
          <li>Toca y arrastra en cualquier sitio para navegar.</li>
          <li>Acércate a una isla para ver su evento.</li>
          <li>La brújula señala lo siguiente sin explorar.</li>
        </ul>
        <p className="juego-muted">Texto de muestra, pendiente de Álvaro.</p>
      </>
    );
  },
};
