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

  return (
    <>
      <nav style={{ 
        borderBottom: '1px solid #e0e0e0', 
        padding: '12px 24px', 
        display: 'flex', 
        gap: '24px',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', marginRight: 'auto' }}>StudyTracker</h1>
        {['dashboard', 'subjects', 'social', 'settings'].map((page) => (
          <button 
            key={page}
            aria-label={`${page} ページへ移動`}
            onClick={() => setCurrentPage(page)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: currentPage === page ? '#0070f3' : '#333',
              fontWeight: currentPage === page ? '600' : '400',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
          >
            {page.charAt(0).toUpperCase() + page.slice(1)}
          </button>
        ))}
      </nav>

      <div ref={contentRef}>
        <CurrentPage />
      </div>
    </>
  )
}

export default App
