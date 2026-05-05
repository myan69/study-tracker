import { useState, useEffect, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import { ModalProvider } from './context/ModalContext'
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

  // ページ切り替えアニメーション
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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'subjects': return <Subjects />
      case 'social': return <Social />
      case 'settings': return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <ModalProvider>
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
        <button 
          onClick={() => setCurrentPage('dashboard')}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontWeight: currentPage === 'dashboard' ? 'bold' : 'normal',
            textDecoration: currentPage === 'dashboard' ? 'underline' : 'none',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          DASHBOARD
        </button>
        <button 
          onClick={() => setCurrentPage('subjects')}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontWeight: currentPage === 'subjects' ? 'bold' : 'normal',
            textDecoration: currentPage === 'subjects' ? 'underline' : 'none',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          SUBJECTS
        </button>
        <button 
          onClick={() => setCurrentPage('social')}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontWeight: currentPage === 'social' ? 'bold' : 'normal',
            textDecoration: currentPage === 'social' ? 'underline' : 'none',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          SOCIAL
        </button>
        <button 
          onClick={() => setCurrentPage('settings')}
          style={{ 
            background: 'none', 
            border: 'none', 
            fontWeight: currentPage === 'settings' ? 'bold' : 'normal',
            textDecoration: currentPage === 'settings' ? 'underline' : 'none',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          SETTINGS
        </button>
      </nav>

      <div ref={contentRef}>
        {renderPage()}
      </div>
    </ModalProvider>
  )
}

export default App
