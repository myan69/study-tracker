import { useState, useEffect, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import anime from 'animejs/lib/anime.min.js'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Subjects from './pages/Subjects'
import Social from './pages/Social'
import Settings from './pages/Settings'

function App() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    if (contentRef.current && !loading && user) {
      anime.set(contentRef.current, { opacity: 0, translateY: 10 })
      anime({
        targets: contentRef.current,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 500,
        easing: 'easeOutQuart'
      })
    }
  }, [currentPage, loading, !!user])

  if (loading) return <div style={{ padding: 20 }}>読み込み中...</div>
  if (!user) return <Login />

  const CurrentPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'subjects': return <Subjects />
      case 'social': return <Social />
      case 'settings': return <Settings />
      default: return <Dashboard />
    }
  }

  const handleNav = (page) => {
    setCurrentPage(page)
    setMenuOpen(false)
  }

  return (
    <>
      <nav style={{ 
        borderBottom: '3px solid #333', 
        padding: '12px 24px', 
        display: 'flex', 
        justifyContent: 'space-between',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>StudyTracker</h1>
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {['dashboard', 'subjects', 'social', 'settings'].map((page) => (
            <button 
              key={page}
              aria-label={`${page} ページへ移動`}
              onClick={() => handleNav(page)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: currentPage === page ? '#0070f3' : '#333',
                fontWeight: currentPage === page ? '800' : '600',
                fontSize: '1rem',
                cursor: 'pointer',
                borderBottom: currentPage === page ? '2px solid #0070f3' : 'none',
                paddingBottom: '2px'
              }}
            >
              {page.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      <div ref={contentRef}>
        <CurrentPage />
      </div>
    </>
  )
}

export default App
