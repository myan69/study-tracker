import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useModal } from '../context/ModalContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import anime from 'animejs/lib/anime.min.js'

function Dashboard() {
  const { user, profile } = useAuth()
  const { showAlert, showConfirm } = useModal()
  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isTimerMode, setIsTimerMode] = useState(false)
  const [subject, setSubject] = useState('')
  const [subjects, setSubjects] = useState([])
  const [logs, setLogs] = useState([])
  const timerRef = useRef(null)
  const historyRef = useRef(null)

  // 全画面モード時にスクロールをロック
  useEffect(() => {
    if (isTimerMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isTimerMode])

  // タイマーのパルスアニメーション
  useEffect(() => {
    let animation = null
    if (isActive && timerRef.current) {
      animation = anime({
        targets: timerRef.current,
        scale: [1, 1.02, 1],
        duration: 1000,
        easing: 'easeInOutQuad',
        loop: true
      })
    } else if (timerRef.current) {
      anime({
        targets: timerRef.current,
        scale: 1,
        duration: 300,
        easing: 'easeOutQuad'
      })
    }
    return () => animation?.pause()
  }, [isActive])

  // 履歴リストのスタッガーアニメーション
  useEffect(() => {
    if (historyRef.current && logs.length > 0) {
      anime({
        targets: '.history-item',
        opacity: [0, 1],
        translateX: [-15, 0],
        delay: anime.stagger(40),
        duration: 500,
        easing: 'easeOutQuart'
      })
    }
  }, [logs])

  // 開発用：DevToolsから操作できるようにする
  useEffect(() => {
    window.setTimer = setSeconds
  }, [])

  // 時間の表示形式を変換 (60m以上は 1h 05m)
  const formatDuration = (mins) => {
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
  }

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('study_logs')
      .select('*, subjects(image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching logs:', error)
    else setLogs(data)
  }

  const handleDelete = async (id) => {
    if (!(await showConfirm('この記録を削除しますか？'))) return
    const { error } = await supabase.from('study_logs').delete().match({ id })
    if (error) showAlert('削除に失敗しました: ' + error.message)
    else fetchLogs()
  }

  const handleReset = async () => {
    if (await showConfirm('タイマーをリセットしますか？')) {
      setSeconds(0)
      setIsActive(false)
      setIsTimerMode(false)
    }
  }

  const handleManualSave = async (h, m) => {
    if (!subject) return showAlert('教材を選択してください')
    const totalMins = (parseInt(h) || 0) * 60 + (parseInt(m) || 0)
    if (totalMins <= 0) return showAlert('有効な時間を入力してください')

    const selectedSubject = subjects.find(s => s.name === subject)
    const { error } = await supabase.from('study_logs').insert([{
      user_id: user.id,
      subject,
      subject_id: selectedSubject?.id,
      duration_minutes: totalMins,
    }])

    if (error) showAlert('保存に失敗しました')
    else {
      showAlert('記録を保存しました！')
      fetchLogs()
    }
  }

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name', { ascending: true })
    setSubjects(data || [])
  }

  useEffect(() => {
    fetchLogs()
    fetchSubjects()
  }, [])

  useEffect(() => {
    let interval = null
    if (isActive) {
      interval = setInterval(() => setSeconds(prev => prev + 1), 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isActive])

  const handleStartStop = () => {
    if (!subject) return showAlert('教材を選択してください')
    if (!isTimerMode) setIsTimerMode(true)
    setIsActive(!isActive)
  }

  const handleExitFullscreen = () => {
    setIsActive(false)
    setIsTimerMode(false)
  }

  const handleSave = async () => {
    if (!subject) return showAlert('教材を選択してください')
    const duration_minutes = Math.floor(seconds / 60)
    
    if (isTimerMode && duration_minutes < 1) {
      if (!(await showConfirm('1分未満の記録は保存されません。タイマーを終了しますか？'))) return
      setSeconds(0)
      setIsActive(false)
      setIsTimerMode(false)
      setSubject('')
      return
    }

    if (duration_minutes < 1) return showAlert('1分以上勉強してから保存してください')

    const selectedSubject = subjects.find(s => s.name === subject)
    const { error } = await supabase.from('study_logs').insert([{
      user_id: user.id,
      subject,
      subject_id: selectedSubject?.id,
      duration_minutes,
    }])

    if (error) showAlert('保存に失敗しました')
    else {
      showAlert('記録を保存しました！')
      setSeconds(0)
      setIsActive(false)
      setIsTimerMode(false)
      setSubject('')
      fetchLogs()
    }
  }

  const formatTime = (s) => {
    const hrs = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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

  return (
    <main className="container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      {/* 全画面タイマーモーダル (Portalを使用して最上位に配置) */}
      {isTimerMode && createPortal(
        <div className="fullscreen-timer" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'white',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {/* 閉じるボタン */}
          <button 
            type="button"
            onClick={handleExitFullscreen}
            style={{
              position: 'absolute',
              top: 30,
              left: 30,
              fontSize: '2rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: 'var(--border-color)',
              zIndex: 10000
            }}
          >
            ✕
          </button>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: getSubjectColor(subject), marginBottom: 10 }}>
              {subject || '学習中'}
            </div>

            <output 
              ref={timerRef}
              style={{ 
                fontSize: 'min(25vw, 15rem)', 
                fontWeight: '900', 
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-5px',
                lineHeight: 1,
                margin: '20px 0'
              }}
            >
              {formatTime(seconds)}
            </output>

            <div style={{ display: 'flex', gap: 20, width: '100%', maxWidth: 600, marginTop: 40 }}>
              <button 
                type="button" 
                onClick={handleStartStop}
                style={{ flex: 1, padding: 30, fontSize: '1.5rem', fontWeight: 'bold', background: isActive ? '#f03e3e' : 'var(--border-color)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {isActive ? 'PAUSE' : 'RESUME'}
              </button>
              <button 
                type="button" 
                onClick={handleSave}
                style={{ flex: 1, padding: 30, fontSize: '1.2rem', fontWeight: 'bold', background: 'transparent', color: 'var(--border-color)', border: '2px solid var(--border-color)', cursor: 'pointer' }}
              >
                FINISH & SAVE
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <header style={{ borderBottom: '3px solid var(--border-color)', marginBottom: 40, paddingBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>STUDY TRACKER</h1>
      </header>

      <section className="timer-section" style={{ marginBottom: 60 }}>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="subject-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>教材を選択</label>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <select id="subject-select" value={subject} onChange={e => setSubject(e.target.value)} style={{ flex: '1 1 300px', padding: '12px', fontSize: '1.2rem', border: '2px solid var(--border-color)', outline: 'none', background: 'transparent' }}>
              <option value="">-- 教材を選択してください --</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            {subject && subjects.find(s => s.name === subject)?.image_url && <img src={subjects.find(s => s.name === subject).image_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', border: '2px solid var(--border-color)' }} />}
          </div>
        </div>

        <output ref={timerRef} role="timer" aria-live="polite" className="timer-display" style={{ display: 'block', fontSize: '6rem', textAlign: 'center', margin: '40px 0', fontWeight: '800', fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}>
          {formatTime(seconds)}
        </output>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleStartStop} 
            style={{ 
              flex: '1 1 150px', 
              padding: '20px', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              background: isActive ? '#f03e3e' : 'var(--border-color)', 
              color: 'white', 
              border: 'none' 
            }}
          >
            {isActive ? 'PAUSE' : (seconds > 0 ? 'RESUME' : 'START')}
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={seconds === 0} 
            style={{ 
              flex: '1 1 150px', 
              padding: '20px', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              background: 'transparent', 
              color: 'var(--border-color)', 
              border: '2px solid var(--border-color)', 
              opacity: seconds === 0 ? 0.3 : 1 
            }}
          >
            FINISH & SAVE
          </button>
          {seconds > 0 && !isActive && (
            <button type="button" onClick={handleReset} style={{ width: '100%', marginTop: 10, padding: '10px', fontSize: '0.8rem', fontWeight: 'bold', background: 'none', color: '#666', border: '1px solid #ddd' }}>RESET TIMER</button>
          )}
        </div>

        <div style={{ marginTop: 30, padding: '20px', border: '1px dashed #ccc' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 'bold' }}>手動で記録を追加</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><input type="number" inputMode="decimal" placeholder="0" id="manual-hours" style={{ width: 60, padding: 8, fontSize: '1rem', border: '1px solid var(--border-color)' }} /><span>時間</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><input type="number" inputMode="decimal" placeholder="0" id="manual-mins" style={{ width: 60, padding: 8, fontSize: '1rem', border: '1px solid var(--border-color)' }} /><span>分</span></div>
            <button type="button" onClick={() => { const h = document.getElementById('manual-hours'), m = document.getElementById('manual-mins'); handleManualSave(h.value, m.value); h.value=''; m.value=''; }} style={{ padding: '8px 15px', background: 'var(--border-color)', color: 'white', border: 'none', fontWeight: 'bold' }}>ADD LOG</button>
          </div>
        </div>
      </section>

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <section aria-labelledby="progress-heading">
          <h2 id="progress-heading" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>PROGRESS</h2>
          <div style={{ height: 250, marginTop: 20 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={{ stroke: '#2c2c2c' }} tickLine={false} />
                <YAxis axisLine={{ stroke: '#2c2c2c' }} tickLine={false} />
                <Tooltip 
                  contentStyle={{ border: '2px solid var(--border-color)', borderRadius: 0 }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  formatter={(value) => [formatDuration(value), '勉強時間']}
                />

                {chartData.keys.map(key => <Bar key={key} dataKey={key} stackId="a" fill={getSubjectColor(key)} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>HISTORY</h2>
          <div style={{ marginTop: 20, maxHeight: 400, overflowY: 'auto' }}>
            {logs.length === 0 ? <p style={{ fontStyle: 'italic', color: '#666' }}>記録はありません</p> : (
              <ul ref={historyRef} style={{ listStyle: 'none', padding: 0 }}>
                {logs.map(log => (
                  <li key={log.id} className="history-item" style={{ padding: '10px 0', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: 15, opacity: 0 }}>
                    {log.subjects?.image_url ? <img src={log.subjects.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid var(--border-color)' }} /> : <div style={{ width: 40, height: 40, background: '#eee' }} />}
                    <span style={{ flex: 1 }}><strong style={{ display: 'block' }}>{log.subject}</strong><time style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(log.created_at).toLocaleDateString()}</time></span>
                    <div style={{ textAlign: 'right' }}><span style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'block' }}>{formatDuration(log.duration_minutes)}</span><button type="button" onClick={() => handleDelete(log.id)} style={{ background: 'none', border: 'none', color: '#f03e3e', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>DELETE</button></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <footer style={{ marginTop: 80, borderTop: '1px solid #ddd', paddingTop: 20, paddingBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>
          Logged in as: <strong>{profile?.username || user.email}</strong>
        </span>
        <button type="button" onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: '1px solid #ddd', padding: '5px 10px', fontSize: '0.8rem' }}>LOGOUT</button>
      </footer>
    </main>
  )
}

export default Dashboard
