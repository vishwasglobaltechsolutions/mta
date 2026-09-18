import Link from 'next/link';
import { PackageSearch, LayoutDashboard } from 'lucide-react';

export default function Home() {
  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>

      {/* Hero Section / Banner */}
      <div style={{
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 1rem',
        width: '100%'
      }}>
        {/* Logo */}
        <div style={{
          width: '85px',
          height: '85px',
          borderRadius: '50%',
          marginBottom: '1rem',
          boxShadow: '0 8px 30px rgba(6, 82, 157, 0.3)',
          border: '3px solid rgba(255,255,255,1)',
          overflow: 'hidden',
          backgroundColor: 'var(--primary)',
          animation: 'pulseGlow 3s infinite'
        }}>
          <img
            src="https://res.cloudinary.com/diaba1bf2/image/upload/v1789719211/LogoSA_n0ri05.jpg"
            alt="Sharada Arts Logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Company Name */}
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: '800',
          margin: '0 0 0.25rem 0',
          color: 'white',
          letterSpacing: '1px',
          lineHeight: '1.1',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span><span style={{ color: 'var(--accent)' }}>S</span>harada</span>
          <span><span style={{ color: 'var(--accent)' }}>A</span>rts</span>
        </h1>

        {/* Subtitle */}
        <h2 style={{
          fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
          fontWeight: '500',
          color: 'var(--text-main)',
          letterSpacing: '0.05em',
          margin: 0,
          opacity: 0.95
        }}>
          Total Industrial Display Solution
        </h2>
      </div>

      {/* Navigation Cards */}
      <div className="nav-cards-container">
        <Link href="/admin" className="nav-link">
          <div className="card nav-card" style={{ borderRadius: '20px' }}>
            <div className="nav-card-icon-wrapper" style={{
              background: 'rgba(6, 82, 157, 0.15)',
              color: 'var(--primary)',
              boxShadow: '0 0 30px rgba(6, 82, 157, 0.3)',

            }}
            >
              <LayoutDashboard size={40} />
            </div>
            <div>
              <h2 className="nav-card-title">Admin Panel</h2>
              <p className="nav-card-desc">Manage inventory, perform CRUD operations, and generate QR codes.</p>
            </div>
          </div>
        </Link>

        <Link href="/picker" className="nav-link">
          <div className="card nav-card" style={{ borderRadius: '20px' }}>
            <div className="nav-card-icon-wrapper" style={{
              background: 'rgba(240, 86, 35, 0.15)',
              color: 'var(--accent)',
              boxShadow: '0 0 30px rgba(240, 86, 35, 0.3)'
            }}
            >
              <PackageSearch size={40} />
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
