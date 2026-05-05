import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useModal } from '../context/ModalContext'

function Login() {
  const { showAlert } = useModal()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    if (isRegister) {
      if (!username) return showAlert('名前を入力してください')
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        if (error.message.includes('registered')) setError('このメールアドレスは既に登録されています。')
        else setError('登録に失敗しました: ' + error.message)
      }
      else {
        // プロフィールに名前を保存（トリガー完了を待つために少し待機してリトライ）
        if (data.user) {
          let retries = 3
          while (retries > 0) {
            const { data: updated, error: updateError } = await supabase
              .from('profiles')
              .update({ username })
              .match({ id: data.user.id })
              .select()
            
            if (updated && updated.length > 0) break;
            
            retries--
            await new Promise(r => setTimeout(r, 1000))
          }
        }
        showAlert('確認メールを送信しました。\nメール内のリンクをクリックして登録を完了してください。')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login')) setError('メールアドレスまたはパスワードが正しくありません。')
        else setError('ログインに失敗しました: ' + error.message)
      }
      else showAlert('ログイン成功！')
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: '100px auto', padding: 40, border: '4px solid var(--border-color)', backgroundColor: 'white' }}>
      <h2 style={{ fontSize: '2rem', marginTop: 0, marginBottom: 30, borderBottom: '2px solid var(--border-color)', paddingBottom: 10 }}>
        {isRegister ? 'SIGN UP' : 'LOGIN'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="username-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>USER NAME</label>
            <input
              id="username-input"
              type="text"
              placeholder="あなたの名前"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ 
                display: 'block', 
                width: '100%', 
                padding: 12, 
                fontSize: '1rem',
                border: '2px solid var(--border-color)', 
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
        )}
        
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="email-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>EMAIL</label>
          <input
            id="email-input"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: 12, 
              border: '2px solid var(--border-color)', 
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: 30 }}>
          <label htmlFor="password-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>PASSWORD</label>
          <input
            id="password-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: 12, 
              border: '2px solid var(--border-color)', 
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: '#f03e3e', fontWeight: 'bold', marginBottom: 20 }}>
            {error}
          </p>
        )}
        
        <button 
          type="submit" 
          style={{ 
            width: '100%', 
            padding: 15, 
            background: 'var(--border-color)', 
            color: 'white', 
            border: 'none', 
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          {isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}
        </button>
      </form>

      <p
        onClick={() => setIsRegister(!isRegister)}
        style={{ 
          marginTop: 20, 
          cursor: 'pointer', 
          textAlign: 'center', 
          textDecoration: 'underline',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}
      >
        {isRegister ? 'GO TO LOGIN' : 'CREATE NEW ACCOUNT'}
      </p>
    </main>
  )
}

export default Login
