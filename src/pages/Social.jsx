import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useModal } from '../context/ModalContext'
import FriendProfile from './FriendProfile'

function Social() {
  const { user } = useAuth()
  const { showAlert, showConfirm } = useModal()
  
  if (!user) return null

  const [searchEmail, setSearchEmail] = useState('')
  const [following, setFollowing] = useState([])
  const [requests, setRequests] = useState([])
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. 自分に届いているリクエスト (Pending)
      const { data: reqData } = await supabase
        .from('follows')
        .select('follower_id, profiles!follower_id(email, username)')
        .eq('following_id', user.id)
        .eq('status', 'pending')
      setRequests(reqData || [])

      // 2. 自分がフォローしている人 (All)
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id, status, profiles!following_id(email, username)')
        .eq('follower_id', user.id)
      setFollowing(followingData || [])

      // 3. 承認済み友達のフィード
      const acceptedIds = followingData?.filter(f => f.status === 'accepted').map(f => f.following_id) || []
      
      if (acceptedIds.length > 0) {
        const { data: logs } = await supabase
          .from('study_logs')
          .select('*')
          .in('user_id', acceptedIds)
          .order('created_at', { ascending: false })
          .limit(20)

        if (logs && logs.length > 0) {
          const profileIds = logs.map(l => l.user_id)
          const { data: profiles } = await supabase.from('profiles').select('id, email, username').in('id', profileIds)
          const { data: subjects } = await supabase.from('subjects').select('id, image_url').in('id', logs.map(l => l.subject_id).filter(id => id))

          setFeed(logs.map(log => ({
            ...log,
            profiles: profiles?.find(p => p.id === log.user_id),
            subjects: subjects?.find(s => s.id === log.subject_id)
          })))
        } else {
          setFeed([])
        }
      } else {
        setFeed([])
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFollow = async (e) => {
    e.preventDefault()
    const searchTerm = searchEmail.trim().toLowerCase()
    if (!searchTerm) return

    if (searchTerm === user.email.toLowerCase()) {
      return showAlert('自分自身はフォローできません')
    }

    // メールアドレスまたはニックネームでユーザーを探す
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username')
      .or(`email.ilike.${searchTerm},username.ilike.${searchTerm}`)
      .single()

    if (profileError || !profile) {
      return showAlert('ユーザーが見つかりませんでした')
    }

    if (profile.id === user.id) {
      return showAlert('自分自身はフォローできません')
    }

    const { error: followError } = await supabase
      .from('follows')
      .insert([{ follower_id: user.id, following_id: profile.id, status: 'pending' }])

    if (followError) {
      if (followError.code === '23505') {
        showAlert('申請済みまたはフォロー済みです')
      } else {
        showAlert('エラーが発生しました: ' + followError.message)
      }
    } else {
      showAlert(`${profile.username || profile.email} にフォローリクエストを送りました`)
      setSearchEmail('')
      fetchData()
    }
  }

  const handleAccept = async (followerId) => {
    try {
      // 1. 相手から自分へのフォローを承認
      const { error: acceptError } = await supabase
        .from('follows')
        .update({ status: 'accepted' })
        .match({ follower_id: followerId, following_id: user.id })

      if (acceptError) throw acceptError

      // 2. 自分から相手へのフォローも 'accepted' で作成 (upsert)
      // これにより、承認した瞬間に相互フォローになる
      const { error: mutualError } = await supabase
        .from('follows')
        .upsert([{ 
          follower_id: user.id, 
          following_id: followerId, 
          status: 'accepted' 
        }])

      if (mutualError) throw mutualError

      showAlert('相互フォローになりました！')
      fetchData()
    } catch (error) {
      console.error('Accept error:', error)
      showAlert('承認に失敗しました')
    }
  }

  const handleReject = async (followerId) => {
    const { error } = await supabase.from('follows').delete().match({ follower_id: followerId, following_id: user.id })
    if (error) showAlert('拒否に失敗しました')
    else fetchData()
  }

  const handleUnfollow = async (followingId) => {
    if (!(await showConfirm('フォローを解除しますか？'))) return
    await supabase.from('follows').delete().match({ follower_id: user.id, following_id: followingId })
    fetchData()
  }

  if (selectedFriend) {
    return <FriendProfile friend={selectedFriend} onBack={() => setSelectedFriend(null)} />
  }

  return (
    <main className="container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <header style={{ borderBottom: '3px solid var(--border-color)', marginBottom: 40, paddingBottom: 10 }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>SOCIAL</h1>
      </header>

      <section style={{ marginBottom: 40, border: '2px solid var(--border-color)', padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>友達を探す</h2>
        <form onSubmit={handleFollow} style={{ display: 'flex', gap: 10 }}>
          <input type="email" placeholder="友達のメールアドレス" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} style={{ flex: 1, padding: 12, border: '2px solid var(--border-color)', outline: 'none' }} required />
          <button type="submit" style={{ padding: '0 20px', background: 'var(--border-color)', color: 'white', border: 'none', fontWeight: 'bold' }}>REQUEST</button>
        </form>
      </section>

      {requests.length > 0 && (
        <section style={{ marginBottom: 40, background: '#fff9db', border: '2px solid #fab005', padding: 20 }}>
          <h2 style={{ marginTop: 0, color: '#f08c00' }}>FOLLOW REQUESTS ({requests.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {requests.map(req => (
              <li key={req.follower_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #ffe066' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{req.profiles?.username || 'NO NAME'}</span>
                  <span style={{ fontSize: '0.7rem', color: '#998a00' }}>{req.profiles?.email}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleAccept(req.follower_id)} style={{ padding: '5px 15px', background: '#40c057', color: 'white', border: 'none', fontWeight: 'bold' }}>ACCEPT</button>
                  <button onClick={() => handleReject(req.follower_id)} style={{ padding: '5px 15px', background: 'none', border: '1px solid #fa5252', color: '#fa5252', fontWeight: 'bold' }}>REJECT</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <section>
          <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>FRIENDS FEED</h2>
          <div style={{ marginTop: 20 }}>
            {feed.length === 0 ? <p style={{ fontStyle: 'italic', color: '#666' }}>承認済みの友達の記録がここに表示されます</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {feed.map(log => (
                  <li key={log.id} style={{ padding: '15px', border: '2px solid var(--border-color)', marginBottom: 15, background: 'white' }}>
                    <div 
                      onClick={() => setSelectedFriend({ id: log.user_id, email: log.profiles?.email, username: log.profiles?.username })}
                      style={{ marginBottom: 8, cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: '900', fontSize: '1.1rem', textDecoration: 'underline' }}>
                        {log.profiles?.username || 'NO NAME'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999' }}>{log.profiles?.email}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      {log.subjects?.image_url ? <img src={log.subjects.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', border: '1px solid #ddd' }} /> : <div style={{ width: 40, height: 40, background: '#eee' }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold' }}>{log.subject}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{log.duration_minutes >= 60 ? `${Math.floor(log.duration_minutes/60)}h ${log.duration_minutes%60}m` : `${log.duration_minutes}m`}</div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#999' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 5 }}>FOLLOWING</h2>
          <div style={{ marginTop: 20 }}>
            {following.length === 0 ? <p style={{ fontStyle: 'italic', color: '#666' }}>フォロー中のユーザーはいません</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {following.map(f => (
                  <li key={f.following_id} style={{ padding: '10px 0', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div 
                      onClick={() => f.status === 'accepted' && setSelectedFriend({ id: f.following_id, email: f.profiles?.email, username: f.profiles?.username })}
                      style={{ cursor: f.status === 'accepted' ? 'pointer' : 'default' }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', textDecoration: f.status === 'accepted' ? 'underline' : 'none' }}>
                        {f.profiles?.username || 'NO NAME'}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#999' }}>{f.profiles?.email}</div>
                      {f.status === 'pending' && <span style={{ fontSize: '0.6rem', background: '#eee', padding: '2px 5px', fontWeight: 'bold' }}>PENDING</span>}
                    </div>
                    <button onClick={() => handleUnfollow(f.following_id)} style={{ background: 'none', border: 'none', color: '#f03e3e', fontSize: '0.7rem', fontWeight: 'bold' }}>UNFOLLOW</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Social
