import Link from 'next/link';
import { PackageSearch, LayoutDashboard } from 'lucide-react';

export default function Home() {
  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center' }}>

      {/* Hero Section */}
      <div style={{ marginBottom: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
          <h1
            style={{
              fontSize: '5.5rem',
              fontWeight: '800',
              margin: '0',
              background: 'linear-gradient(to bottom right, #ffffff 30%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.03em',
              lineHeight: '1.1',
              paddingBottom: '0.1em'
            }}
          >
            Sharada Art's
          </h1>
          <div style={{
            position: 'absolute',
            bottom: '5px',
            left: '10%',
            width: '80%',
            height: '3px',
            background: 'linear-gradient(to right, transparent, var(--primary), transparent)',
            borderRadius: '2px',
            opacity: 0.8
          }}></div>
        </div>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '500',
          color: '#cbd5e1',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '1.5rem'
        }}
        >
          Material Tracking System
        </h2>
        <p style={{
          color: '#f1f5f9',
          fontSize: '1.15rem',
          maxWidth: '650px',
          lineHeight: '1.7',
          opacity: 0.9
        }}
        >
          A state-of-the-art material tracking solution. Manage your inventory, generate QR codes, and empower your pickers with real-time updates.
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="nav-cards-container">
        <Link href="/admin" className="nav-link">
          <div className="card nav-card">
            <div className="nav-card-icon-wrapper" style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)'
            }}
            >
              <LayoutDashboard size={56} />
            </div>
            <div>
              <h2 className="nav-card-title">Admin Panel</h2>
              <p className="nav-card-desc">Manage inventory, perform CRUD operations, and generate QR codes.</p>
            </div>
          </div>
        </Link>

        <Link href="/picker" className="nav-link">
          <div className="card nav-card">
            <div className="nav-card-icon-wrapper" style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
            }}
            >
              <PackageSearch size={56} />
            </div>
            <div>
              <h2 className="nav-card-title">Picker Panel</h2>
              <p className="nav-card-desc">Search and filter items, update quantities, and prepare orders.</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
