import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useModal } from '../context/ModalContext'

function Settings() {
  const { user, refreshProfile } = useAuth()
  const { showAlert } = useModal()
  const [newPassword, setNewPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  // 現在のユーザー名を取得
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      if (data) setUsername(data.username || '')
    }
    fetchProfile()
  }, [user.id])

  const handleUpdateUsername = async (e) => {
    e.preventDefault()
    if (!username) return showAlert('名前を入力してください')

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .match({ id: user.id })

      if (error) throw error
      
      await refreshProfile()
      showAlert('ユーザー名を更新しました')
    } catch (error) {
      showAlert('更新に失敗しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) return showAlert('パスワードは6文字以上で入力してください')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      showAlert('更新に失敗しました: ' + error.message)
    } else {
      showAlert('パスワードを更新しました')
      setNewPassword('')
    }
    setLoading(false)
  }

  return (
    <main className="container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <header style={{ borderBottom: '3px solid var(--border-color)', marginBottom: 40, paddingBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>SETTINGS</h1>
      </header>

      <section style={{ maxWidth: 400, border: '2px solid var(--border-color)', padding: 30, background: 'white', marginBottom: 40 }}>
        <h2 style={{ marginTop: 0 }}>プロフィールの設定</h2>
        <form onSubmit={handleUpdateUsername}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="username" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>ユーザー名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="あなたの名前"
              style={{ width: '100%', padding: 12, border: '2px solid var(--border-color)', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: 15, 
              background: 'var(--border-color)', 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold',
              opacity: loading ? 0.5 : 1
            }}
          >
            UPDATE USER NAME
          </button>
        </form>
      </section>

      <section style={{ maxWidth: 400, border: '2px solid var(--border-color)', padding: 30, background: 'white' }}>
        <h2 style={{ marginTop: 0 }}>パスワードの変更</h2>
        <form onSubmit={handleUpdatePassword}>
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="new-password" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>新しいパスワード</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="6文字以上"
              style={{ width: '100%', padding: 12, border: '2px solid var(--border-color)', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: 15, 
              background: 'var(--border-color)', 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 60, padding: 20, border: '1px solid #fa5252', background: '#fff5f5' }}>
        <h2 style={{ marginTop: 0, color: '#fa5252', fontSize: '1.2rem' }}>DANGER ZONE</h2>
        <p style={{ fontSize: '0.9rem' }}>
          アカウントの削除は、現在管理者のみが行えます。
          削除を希望される場合は、お問い合わせください。
        </p>
        <p style={{ fontSize: '0.8rem', color: '#666' }}>ログイン中のメールアドレス: {user.email}</p>
      </section>
    </main>
  )
}

export default Settings
