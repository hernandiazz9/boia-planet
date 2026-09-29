/**
 * Logo de BOIA (T50): la mascota y el wordmark de Álvaro, vectorizados en
 * art/marca/ (tools/blender/intro/trazar_marca.py). Las copias de la web (las
 * variantes ligeras de art/marca/logo/)
 * están en ../_marca/ y las pinta el CSS (landing.css › .brand-logo), así las
 * sirve Next como archivos estáticos sin tipos de importación de imágenes.
 *
 * `label`: el nombre para lectores de pantalla; sin él es decorativo (el
 * enlace que lo envuelve ya se nombra).
 */
export function BrandLogo({
  size = 'header',
  label,
}: {
  size?: 'header' | 'footer';
  label?: string;
}) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <span className={`brand-logo brand-logo--${size}`} {...a11y} data-testid="brand-logo">
      <span className="brand-logo__mascot" />
      <span className="brand-logo__wordmark" />
    </span>
  );
}
