import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import Logo from './Logo'

const C = {
  bg: '#0A0A0A',
  bg2: '#141414',
  card: '#1C1C1C',
  border: '#2A2A2A',
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  silver: '#8A8A8A',
  text: '#F5F5F5',
  textSub: '#6B6B6B',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  async function login() {
    if (!email || !password) { setError('Ingresa email y contraseña'); return }
    setCargando(true)
    setError('')

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('password', password)
      .single()

    if (!usuario) {
      setCargando(false)
      setError('Email o contraseña incorrectos')
      return
    }

    const { data: restaurante } = await supabase
      .from('restaurantes')
      .select('activo, suscripcion_activa, suscripcion_expira')
      .eq('slug', usuario.slug)
      .single()

    setCargando(false)

    if (restaurante) {
      const suscripcionVencida =
        !restaurante.suscripcion_activa ||
        !restaurante.suscripcion_expira ||
        new Date(restaurante.suscripcion_expira) < new Date()

      if (suscripcionVencida) {
        setError('Tu suscripción ha vencido. Contacta a soporte para renovar.')
        return
      }

      if (!restaurante.activo) {
        setError('Tu cuenta está suspendida. Contacta a soporte.')
        return
      }
    }

    sessionStorage.setItem('orderia_user', JSON.stringify(usuario))

    if (usuario.rol === 'cocina') navigate(`/r/${usuario.slug}/cocina`)
    else if (usuario.rol === 'mesero') navigate(`/r/${usuario.slug}/mesero`)
    else if (usuario.rol === 'mesas') navigate(`/r/${usuario.slug}/mesas`)
    else if (usuario.rol === 'dashboard') navigate(`/r/${usuario.slug}/dashboard`)
    else navigate('/')
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size={72} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: C.text, letterSpacing: '0.5px' }}>
            Order Moreno
          </div>
          <div style={{ fontSize: '11px', color: C.gold, marginTop: '6px', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Moreno Technology
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: '20px', padding: '28px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>Iniciar sesión</div>
          <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '24px' }}>Accede a tu panel de trabajo</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: C.silver, display: 'block', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Email</label>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="tu@email.com"
              style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.bg2, color: C.text }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: C.silver, display: 'block', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Contraseña</label>
            <input
              type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••"
              style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.bg2, color: C.text }}
            />
          </div>

          {error && (
            <div style={{ background: '#2A1010', border: '1px solid #5A2020', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#E57373', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button onClick={login} disabled={cargando}
            style={{ width: '100%', background: cargando ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: cargando ? 'not-allowed' : 'pointer', letterSpacing: '0.5px' }}>
            {cargando ? 'Verificando...' : 'Entrar →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: C.textSub, letterSpacing: '1px' }}>
          MORENO TECHNOLOGY © 2026
        </div>

      </div>
    </div>
  )
}