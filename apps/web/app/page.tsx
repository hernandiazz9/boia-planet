import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>boia-planet · demo</h1>
        <p style={{ opacity: 0.7, margin: '0 0 24px' }}>Motor base con barco provisional.</p>
        <Link
          href="/juego"
          style={{
            display: 'inline-block',
            minHeight: 56,
            lineHeight: '56px',
            padding: '0 32px',
            borderRadius: 28,
            background: 'var(--boia-orange)',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Navegar
        </Link>
      </div>
    </main>
  );
}
