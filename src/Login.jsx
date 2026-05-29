import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
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

    setCargando(false)

    if (!usuario) { setError('Email o contraseña incorrectos'); return }

    localStorage.setItem('orderia_user', JSON.stringify(usuario))

    if (usuario.rol === 'cocina') navigate(`/r/${usuario.slug}/cocina`)
    else if (usuario.rol === 'mesero') navigate(`/r/${usuario.slug}/mesero`)
    else if (usuario.rol === 'mesas') navigate(`/r/${usuario.slug}/mesas`)
    else if (usuario.rol === 'dashboard') navigate(`/r/${usuario.slug}/dashboard`)
    else navigate('/')
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.fondo, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: C.textoPrincipal }}>OrderIA</div>
          <div style={{ fontSize: '14px', color: C.textoSecundario, marginTop: '4px' }}>Inicia sesión para continuar</div>
        </div>

        <div style={{ background: C.blanco, borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(44,37,35,0.06)' }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="tu@email.com"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid #E5DFD9`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>CONTRASEÑA</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="••••••••"
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid #E5DFD9`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
            />
          </div>

          {error && (
            <div style={{ background: '#FDE8E8', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.rojo, marginBottom: '14px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          <button
            onClick={login}
            disabled={cargando}
            style={{ width: '100%', background: cargando ? '#E5DFD9' : C.rojo, color: C.blanco, border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: cargando ? 'not-allowed' : 'pointer', marginTop: '4px' }}
          >
            {cargando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}