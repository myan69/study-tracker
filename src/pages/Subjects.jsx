import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useModal } from '../context/ModalContext'

function Subjects() {
  const { user } = useAuth()
  const { showAlert, showConfirm } = useModal()
  
  if (!user) return null

  const [subjects, setSubjects] = useState([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b5bdb')
  
  // 新しいカラーパレット
  const PALETTE = [
    '#da200e', '#da9a0e', '#9fda0e', '#25da0e', 
    '#0eda72', '#0ec8da', '#0e4eda', '#490eda', 
    '#c30eda', '#da0e76'
  ]
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching subjects:', error)
    else setSubjects(data)
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  const handleUpload = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('subject-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('subject-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name) return showAlert('名前を入力してください')
    
    setUploading(true)
    try {
      let image_url = subjects.find(s => s.id === editingId)?.image_url || null
      if (file) {
        image_url = await handleUpload(file)
      }

      if (editingId) {
        const { error } = await supabase
          .from('subjects')
          .update({ name, image_url, color })
          .match({ id: editingId })
        if (error) throw error
        showAlert('更新しました')
      } else {
        const { error } = await supabase.from('subjects').insert([
          { user_id: user.id, name, image_url, color }
        ])
        if (error) throw error
        showAlert('登録しました')
      }

      setName('')
      setColor('#3b5bdb')
      setFile(null)
      setEditingId(null)
      fetchSubjects()
    } catch (error) {
      showAlert('エラーが発生しました: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (subject) => {
    setEditingId(subject.id)
    setName(subject.name)
    setColor(subject.color || '#3b5bdb')
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!(await showConfirm('この教材を削除しますか？'))) return

    const { error } = await supabase.from('subjects').delete().match({ id })
    if (error) {
      showAlert('削除に失敗しました')
    } else {
      fetchSubjects()
    }
  }

  return (
    <main className="container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <header style={{ borderBottom: '3px solid var(--border-color)', marginBottom: 40, paddingBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>SUBJECTS</h1>
      </header>

      <section style={{ marginBottom: 60, border: '2px solid var(--border-color)', padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>{editingId ? '教材の編集' : '教材の新規登録'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="name-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>教材名</label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 数学、英語..."
              style={{ width: '100%', padding: 12, border: '2px solid var(--border-color)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>テーマカラー</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#f8f9fa', padding: 15, border: '2px solid var(--border-color)' }}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 35,
                    height: 35,
                    backgroundColor: c,
                    border: color === c ? '4px solid white' : '1px solid rgba(0,0,0,0.1)',
                    outline: color === c ? '3px solid var(--border-color)' : 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title={c}
                />
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: '0.8rem', fontWeight: 'bold', color }}>
              SELECTED: {color.toUpperCase()}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="image-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>教材の画像 {editingId && '(変更する場合のみ選択)'}</label>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files[0])}
              style={{ width: '100%', padding: 12, border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              type="submit" 
              disabled={uploading}
              style={{ 
                flex: 1, 
                padding: 15, 
                background: 'var(--border-color)', 
                color: 'white', 
                border: 'none', 
                fontWeight: 'bold',
                opacity: uploading ? 0.5 : 1
              }}
            >
              {uploading ? 'UPLOADING...' : (editingId ? 'UPDATE SUBJECT' : 'REGISTER SUBJECT')}
            </button>
            {editingId && (
              <button 
                type="button"
                onClick={() => { setEditingId(null); setName(''); setFile(null); }}
                style={{ padding: '0 20px', background: 'none', border: '1px solid #ddd' }}
              >
                CANCEL
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>REGISTERED SUBJECTS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginTop: 20 }}>
          {subjects.map(s => (
            <div key={s.id} style={{ border: `4px solid ${s.color || 'var(--border-color)'}`, padding: 10, textAlign: 'center', background: 'white' }}>
              {s.image_url ? (
                <img src={s.image_url} alt={s.name} style={{ width: '100%', height: 120, objectFit: 'cover', marginBottom: 10, borderBottom: '1px solid #ddd' }} />
              ) : (
                <div style={{ width: '100%', height: 120, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>NO IMAGE</div>
              )}
              <strong style={{ display: 'block', marginBottom: 5 }}>{s.name}</strong>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: 10, color: s.color || 'var(--border-color)' }}>
                {s.color || '#3B5BDB'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 15 }}>
                <button 
                  onClick={() => handleEdit(s)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  EDIT
                </button>
                <button 
                  onClick={() => handleDelete(s.id)}
                  style={{ background: 'none', border: 'none', color: '#f03e3e', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  DELETE
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Subjects
