import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import anime from 'animejs/lib/anime.min.js'

function FriendProfile({ friend, onBack }) {
  const [logs, setLogs] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const historyRef = useRef(null)
  const containerRef = useRef(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. 友達の教材データを取得（色情報のため）
      const { data: subData } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', friend.id)
      setSubjects(subData || [])

      // 2. 友達の勉強記録を取得
      const { data: logData, error } = await supabase
        .from('study_logs')
        .select('*, subjects(image_url)')
        .eq('user_id', friend.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setLogs(logData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // コンテナの出現アニメーション
    if (containerRef.current) {
      anime({
        targets: containerRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutQuart'
      })
    }
  }, [friend.id])

  // 履歴のスタッガーアニメーション
  useEffect(() => {
    if (!loading && logs.length > 0) {
      anime({
        targets: '.friend-history-item',
        opacity: [0, 1],
        translateX: [-15, 0],
        delay: anime.stagger(40),
        duration: 500,
        easing: 'easeOutQuart'
      })
    }
  }, [loading, logs])

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }

  const COLORS = ['#da200e', '#da9a0e', '#9fda0e', '#25da0e', '#0eda72', '#0ec8da', '#0e4eda', '#490eda', '#c30eda', '#da0e76']
  const getSubjectColor = (name) => {
    const s = subjects.find(s => s.name === name)
    if (s && s.color) return s.color
    const index = subjects.findIndex(s => s.name === name)
    return COLORS[index % COLORS.length] || '#2c2c2c'
  }

  const chartData = useMemo(() => {
    const dataMap = {}
    const activeSubjects = new Set()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      dataMap[dateStr] = { name: dateStr }
    }

    logs.forEach(log => {
      const dateStr = new Date(log.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      if (dataMap[dateStr]) {
        activeSubjects.add(log.subject)
        dataMap[dateStr][log.subject] = (dataMap[dateStr][log.subject] || 0) + log.duration_minutes
      }
    })

    return { data: Object.values(dataMap), keys: Array.from(activeSubjects) }
  }, [logs, subjects])

  // ポータルで最上位に描画
  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'white',
      zIndex: 5000,
      overflowY: 'auto',
      padding: '40px 20px',
      boxSizing: 'border-box'
    }}>
      <div ref={containerRef} className="container" style={{ maxWidth: 800, margin: '0 auto', opacity: 0 }}>
        <button 
          onClick={onBack} 
          style={{ 
            background: 'none', 
            border: '2px solid var(--border-color)', 
            padding: '10px 20px', 
            marginBottom: 30, 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ✕ CLOSE PROFILE
        </button>
        
        <header style={{ borderBottom: '4px solid var(--border-color)', marginBottom: 40, paddingBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: '2.5rem', textTransform: 'uppercase' }}>{friend.username || friend.email}</h1>
          <p style={{ margin: 5, color: '#666', fontWeight: 'bold' }}>FRIEND'S STUDY DATA</p>
        </header>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          <section>
            <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>WEEKLY PROGRESS</h2>
            <div style={{ height: 250, marginTop: 20 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={{ stroke: '#2c2c2c' }} tickLine={false} />
                  <YAxis axisLine={{ stroke: '#2c2c2c' }} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ border: '2px solid var(--border-color)', borderRadius: 0 }} 
                    formatter={(value, name) => [formatDuration(value), name]}
                  />
                  {chartData.keys.map(key => (
                    <Bar key={key} dataKey={key} stackId="a" fill={getSubjectColor(key)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>STUDY HISTORY</h2>
            <div style={{ marginTop: 20 }}>
              {loading ? <p>読み込み中...</p> : logs.length === 0 ? <p style={{ fontStyle: 'italic', color: '#666' }}>記録はありません</p> : (
                <ul ref={historyRef} style={{ listStyle: 'none', padding: 0 }}>
                  {logs.map(log => (
                    <li key={log.id} className="friend-history-item" style={{ 
                      padding: '15px', 
                      borderBottom: '1px solid #ddd', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 15,
                      opacity: 0 
                    }}>
                      {log.subjects?.image_url ? (
                        <img src={log.subjects.image_url} alt="" style={{ width: 45, height: 45, objectFit: 'cover', border: '1px solid #ddd' }} />
                      ) : (
                        <div style={{ width: 45, height: 45, background: '#eee' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block' }}>{log.subject}</strong>
                        <time style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(log.created_at).toLocaleDateString()}</time>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                        {formatDuration(log.duration_minutes)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default FriendProfile
