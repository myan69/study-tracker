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
        borderBottom: '2px solid var(--border-color)', 
        padding: '10px 20px', 
        display: 'flex', 
        gap: 20,
        background: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexWrap: 'wrap'
      }}>
        {['dashboard', 'subjects', 'social', 'settings'].map((page) => (
          <button 
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontWeight: currentPage === page ? 'bold' : 'normal',
              textDecoration: currentPage === page ? 'underline' : 'none',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            {page.toUpperCase()}
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
