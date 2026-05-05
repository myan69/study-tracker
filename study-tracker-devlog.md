# 勉強記録アプリ 開発ログ

## スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React + Vite |
| バックエンド / DB / 認証 | Supabase |
| ホスティング | Vercel |

---

## Phase 1：プロジェクトセットアップ

### 1. Vite + React の作成

```bash
npm create vite@latest study-tracker -- --template react
cd study-tracker
npm install @supabase/supabase-js
```

### 2. ディレクトリ構成

```
study-tracker/
├── .env                        ← Supabase の接続情報
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── context/
    │   └── AuthContext.jsx
    ├── lib/
    │   └── supabase.js
    └── pages/
        └── Login.jsx
```

---

## Phase 2：Supabase 接続

### .env（プロジェクトルートに配置）

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> Supabase ダッシュボード → Settings → API から取得

### src/lib/supabase.js

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 接続確認（一時的なテストコード）

```jsx
import { supabase } from './lib/supabase'

function App() {
  const test = async () => {
    const { data, error } = await supabase.auth.getSession()
    console.log('接続OK:', data, error)
  }
  test()

  return <div>接続テスト中... コンソールを確認してください</div>
}

export default App
```

コンソールに `接続OK` と表示されれば成功。

---

## Phase 3：認証

### Supabase ダッシュボードの設定

- Authentication → Providers → Email
- **「Confirm email」をオフ**（開発中はメール確認不要）

### src/pages/Login.jsx

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else alert('登録完了！')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else alert('ログイン成功！')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>{isRegister ? '新規登録' : 'ログイン'}</h2>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />
      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSubmit} style={{ width: '100%', padding: 10 }}>
        {isRegister ? '登録' : 'ログイン'}
      </button>
      <p
        onClick={() => setIsRegister(!isRegister)}
        style={{ marginTop: 16, cursor: 'pointer', color: 'blue' }}
      >
        {isRegister ? 'ログインはこちら' : '新規登録はこちら'}
      </p>
    </div>
  )
}

export default Login
```

---

## Phase 4：ログイン状態の管理

### src/context/AuthContext.jsx

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### src/main.jsx

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
```

### src/App.jsx（ログイン状態で画面切り替え）

```jsx
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'

function App() {
  const { user, loading } = useAuth()

  if (loading) return <div>読み込み中...</div>

  return user ? <div>{user.email} でログイン中</div> : <Login />
}

export default App
```

ログイン済みのときはメールアドレスが表示されれば成功。

---

## Phase 5：ダッシュボードとタイマーの実装

### 1. Supabase のテーブル作成

SQL Editor で以下を実行：

```sql
create table study_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  subject text not null,
  duration_minutes integer not null,
  created_at timestamptz default now()
);

alter table study_logs enable row level security;

create policy "Users can view their own logs" on study_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own logs" on study_logs for insert with check (auth.uid() = user_id);
```

### 2. src/pages/Dashboard.jsx の作成

タイマー機能と、記録の保存機能を実装する。

---

## 次のステップ

- [x] Phase 4 完了
- [ ] Dashboard.jsx の作成（タイマー実装）
- [ ] 記録の一覧表示
- [ ] 統計グラフ（Recharts）
- [ ] Vercel デプロイ
