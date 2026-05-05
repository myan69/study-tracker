import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) // 名前を保持
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfile = async (userId) => {
      const { data } = await supabase.from('profiles').select('username').eq('id', userId).single()
      setProfile(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) getProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) getProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ 
        user, 
        profile, 
        loading, 
        refreshProfile: async () => {
          if (!user) return
          const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
          setProfile(data)
        }
      }}>
      {children}
    </AuthContext.Provider>
  )
}


export const useAuth = () => useContext(AuthContext)
