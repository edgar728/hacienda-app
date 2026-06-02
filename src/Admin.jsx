import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
  green: '#4CAF50',
  greenDark: '#2D6A4F',
  red: '#E57373',
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  border: '1px solid #2A2A2A', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', background: '#141414', color: '#F5F5F5',
  marginBottom: '8px',
}

const [adminPassword, setAdminPassword] = useState('')

useEffect(() => {
  supabase.from('configuracion').select('valor').eq('clave', 'admin_password').single()
    .then(({ data }) => { if (data) setAdminPassword(data.valor) })
}, [])

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [restaurantes, setRestaurantes] = useState([])
  const [stats, setStats] = useState({})
  const [cargando, setCargando] = useState(false)
  const [modalRestaurante, setModalRestaurante] = useState(false)
  const [nuevoRestaurante, setNuevoRestaurante] = useState({ nombre: '', slug: '', descripcion: '', mesas: 10 })
  const [creandoRestaurante, setCreandoRestaurante] = useState(false)
  const [errorRestaurante, setErrorRestaurante] = useState('')
  const [modalUsuario, setModalUsuario] = useState(null)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', password: '', rol: 'cocina' })
  const [usuariosRestaurante, setUsuariosRestaurante] = useState([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)

  useEffect(() => {
    const auth = sessionStorage.getItem('orderia_admin')
    if (auth === 'true') { setAutenticado(true); cargarDatos() }
  }, [])

  function login() {
    if (password === adminPassword) {
      sessionStorage.setItem('orderia_admin', 'true')
      setAutenticado(true)
      cargarDatos()
    } else {
      setError('Contraseña incorrecta')
      setPassword('')
    }
  }

  async function cargarDatos() {
    setCargando(true)
    const { data: rests } = await supabase.from('restaurantes').select('*').order('created_at', { ascending: false })
    setRestaurantes(rests || [])
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const statsObj = {}
    for (const r of rests || []) {
      const { data: ordenes } = await supabase.from('ordenes').select('total, estado')
        .eq('restaurante_id', r.id).gte('created_at', hoy.toISOString())
      const ventas = (ordenes || []).reduce((acc, o) => acc + Number(o.total), 0)
      const activas = (ordenes || []).filter(o => o.estado !== 'entregada').length
      statsObj[r.id] = { ordenes: ordenes?.length || 0, ventas, activas }
    }
    setStats(statsObj)
    setCargando(false)
  }

  async function toggleRestaurante(id, activo) {
    await supabase.from('restaurantes').update({ activo: !activo }).eq('id', id)
    setRestaurantes(prev => prev.map(r => r.id === id ? { ...r, activo: !activo } : r))
  }

  async function crearRestaurante() {
    if (!nuevoRestaurante.nombre || !nuevoRestaurante.slug) { setErrorRestaurante('Nombre y slug son obligatorios'); return }
    setCreandoRestaurante(true); setErrorRestaurante('')
    const slugLimpio = nuevoRestaurante.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data: rest, error } = await supabase.from('restaurantes')
      .insert({ nombre: nuevoRestaurante.nombre, slug: slugLimpio, descripcion: nuevoRestaurante.descripcion })
      .select().single()
    if (error) { setErrorRestaurante('El slug ya existe, elige otro'); setCreandoRestaurante(false); return }
    const mesas = []
    for (let i = 1; i <= nuevoRestaurante.mesas; i++) mesas.push({ restaurante_id: rest.id, numero: i, status: 'disponible' })
    await supabase.from('mesas').insert(mesas)
    setRestaurantes(prev => [rest, ...prev])
    setModalRestaurante(false)
    setNuevoRestaurante({ nombre: '', slug: '', descripcion: '', mesas: 10 })
    setCreandoRestaurante(false)
  }

  async function abrirModalUsuarios(restaurante) {
    setModalUsuario(restaurante); setLoadingUsuarios(true)
    const { data } = await supabase.from('usuarios').select('*').eq('restaurante_id', restaurante.id)
    setUsuariosRestaurante(data || []); setLoadingUsuarios(false)
  }

  async function crearUsuario() {
    if (!nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.password) return
    const { data } = await supabase.from('usuarios').insert({
      nombre: nuevoUsuario.nombre, email: nuevoUsuario.email.toLowerCase(),
      password: nuevoUsuario.password, rol: nuevoUsuario.rol,
      restaurante_id: modalUsuario.id, slug: modalUsuario.slug
    }).select().single()
    setUsuariosRestaurante(prev => [...prev, data])
    setNuevoUsuario({ nombre: '', email: '', password: '', rol: 'cocina' })
  }

  async function eliminarUsuario(id) {
    await supabase.from('usuarios').delete().eq('id', id)
    setUsuariosRestaurante(prev => prev.filter(u => u.id !== id))
  }

  const totalOrdenes = Object.values(stats).reduce((a, b) => a + b.ordenes, 0)
  const totalVentas = Object.values(stats).reduce((a, b) => a + b.ventas, 0)
  const totalActivos = restaurantes.filter(r => r.activo).length

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!autenticado) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Glow */}
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', width: '64px', height: '64px', background: C.card, border: '1px solid ' + C.border, borderRadius: '18px', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '18px' }}>⚡</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: C.text, letterSpacing: '-0.5px' }}>
            Moreno <span style={{ color: C.gold }}>Order</span>
          </div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', letterSpacing: '1px' }}>PANEL DE ADMINISTRACIÓN</div>
        </div>

        <div style={{ background: C.card, borderRadius: '20px', padding: '24px', border: '1px solid ' + C.border }}>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Contraseña de acceso"
            style={{ ...inputStyle, border: '1px solid ' + (error ? C.red : C.border), marginBottom: error ? '6px' : '16px' }}
          />
          {error && <div style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{error}</div>}
          <button onClick={login} style={{ width: '100%', background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px' }}>
            Entrar
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '10px', color: '#2A2A2A', letterSpacing: '1px' }}>MORENO TECHNOLOGY</div>
      </div>
    </div>
  )

  // ── PANEL PRINCIPAL ────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: '1px solid ' + C.border, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: C.card, borderRadius: '10px', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚡</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>Admin</div>
            <div style={{ fontSize: '11px', color: C.gold, letterSpacing: '1px' }}>MORENO ORDER</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setModalRestaurante(true)} style={{ background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>
            + Restaurante
          </button>
          <button onClick={cargarDatos} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', fontSize: '14px', color: C.silver, cursor: 'pointer' }}>
            ↻
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs globales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Restaurantes', value: restaurantes.length, sub: totalActivos + ' activos', color: C.text, icon: '🏪' },
            { label: 'Órdenes hoy', value: totalOrdenes, sub: 'en todos', color: C.green, icon: '📋' },
            { label: 'Ventas hoy', value: '$' + totalVentas.toLocaleString(), sub: 'total red', color: C.gold, icon: '💰' },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ background: C.card, borderRadius: '14px', padding: '14px 10px', textAlign: 'center', border: '1px solid ' + C.border }}>
                <div style={{ fontSize: '16px', marginBottom: '6px' }}>{item.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: item.color, letterSpacing: '-0.5px' }}>{item.value}</div>
                <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '10px', color: C.textSub }}>{item.sub}</div>
              </div>
            )
          })}
        </div>

        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ height: '1px', width: '14px', background: C.gold }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', textTransform: 'uppercase' }}>Restaurantes</span>
        </div>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: C.textSub, fontSize: '14px' }}>Cargando...</div>
        )}

        {restaurantes.map(function(r) {
          const s = stats[r.id] || { ordenes: 0, ventas: 0, activas: 0 }
          return (
            <div key={r.id} style={{ background: C.card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid ' + (r.activo ? '#2D6A4F40' : C.border), boxShadow: r.activo ? '0 0 20px #2D6A4F08' : 'none' }}>

              {/* Nombre + toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>{r.nombre}</div>
                  <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{r.descripcion}</div>
                  <div style={{ fontSize: '10px', color: C.gold, marginTop: '4px', fontFamily: 'monospace', letterSpacing: '0.5px' }}>/r/{r.slug}</div>
                </div>
                <button
                  onClick={function() { toggleRestaurante(r.id, r.activo) }}
                  style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', background: r.activo ? '#0D2318' : '#1A0808', color: r.activo ? C.green : C.red, border: '1px solid ' + (r.activo ? '#2D6A4F40' : '#C0392B40') }}
                >
                  {r.activo ? 'Activo' : 'Pausado'}
                </button>
              </div>

              {/* Stats mini */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                {[
                  { label: 'órdenes', value: s.ordenes, color: C.text },
                  { label: 'activas', value: s.activas, color: C.green },
                  { label: 'ventas', value: '$' + s.ventas.toLocaleString(), color: C.gold },
                ].map(function(stat) {
                  return (
                    <div key={stat.label} style={{ background: C.bg2, borderRadius: '10px', padding: '8px', textAlign: 'center', border: '1px solid ' + C.border }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '10px', color: C.textSub, marginTop: '1px' }}>{stat.label}</div>
                    </div>
                  )
                })}
              </div>

              {/* Botón usuarios */}
              <button
                onClick={function() { abrirModalUsuarios(r) }}
                style={{ width: '100%', background: C.bg2, color: C.silver, border: '1px solid ' + C.border, borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '10px' }}
              >
                👥 Gestionar usuarios
              </button>

              {/* Links rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { label: 'Mesa', url: '/r/' + r.slug + '/mesa/1', icon: '🍽️' },
                  { label: 'Cocina', url: '/r/' + r.slug + '/cocina', icon: '🍳' },
                  { label: 'Mesero', url: '/r/' + r.slug + '/mesero', icon: '🛎️' },
                  { label: 'Dashboard', url: '/r/' + r.slug + '/dashboard', icon: '📊' },
                ].map(function(link) {
                  return (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
                      style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 4px', textAlign: 'center', fontSize: '10px', color: C.silver, textDecoration: 'none', fontWeight: '500', display: 'block' }}
                    >
                      <div style={{ fontSize: '14px', marginBottom: '3px' }}>{link.icon}</div>
                      {link.label}
                    </a>
                  )
                })}
              </div>

            </div>
          )
        })}

      </div>

      {/* ═══ MODAL NUEVO RESTAURANTE ═══ */}
      {modalRestaurante && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.bg2, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', border: '1px solid ' + C.border }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>Nuevo restaurante</div>
              <button onClick={function() { setModalRestaurante(false); setErrorRestaurante('') }} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>

            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>NOMBRE</label>
              <input
                placeholder="Ej: La Hacienda"
                value={nuevoRestaurante.nombre}
                onChange={function(e) {
                  const nombre = e.target.value
                  const slugAuto = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  setNuevoRestaurante(function(prev) { return { ...prev, nombre, slug: slugAuto } })
                  setErrorRestaurante('')
                }}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>SLUG (URL)</label>
              <div style={{ display: 'flex', alignItems: 'center', background: C.bg, borderRadius: '10px', border: '1px solid ' + C.border, overflow: 'hidden', marginBottom: '8px' }}>
                <span style={{ padding: '11px 10px', fontSize: '12px', color: C.textSub, whiteSpace: 'nowrap' }}>/r/</span>
                <input
                  placeholder="la-hacienda"
                  value={nuevoRestaurante.slug}
                  onChange={function(e) { setNuevoRestaurante(function(prev) { return { ...prev, slug: e.target.value } }); setErrorRestaurante('') }}
                  style={{ flex: 1, padding: '11px 10px 11px 0', border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', color: C.text }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>DESCRIPCIÓN</label>
              <input
                placeholder="Ej: Cocina mexicana · Providencia, GDL"
                value={nuevoRestaurante.descripcion}
                onChange={function(e) { setNuevoRestaurante(function(prev) { return { ...prev, descripcion: e.target.value } }) }}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>NÚMERO DE MESAS</label>
              <input
                type="number" min="1" max="50"
                value={nuevoRestaurante.mesas}
                onChange={function(e) { setNuevoRestaurante(function(prev) { return { ...prev, mesas: Number(e.target.value) } }) }}
                style={inputStyle}
              />
              <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>Se crearán {nuevoRestaurante.mesas} mesas automáticamente</div>
            </div>

            {errorRestaurante && (
              <div style={{ background: '#1A0808', border: '1px solid #C0392B40', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.red, marginBottom: '14px', fontWeight: '500' }}>
                {errorRestaurante}
              </div>
            )}

            <button
              onClick={crearRestaurante}
              disabled={creandoRestaurante}
              style={{ width: '100%', background: creandoRestaurante ? C.border : 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: creandoRestaurante ? C.textSub : '#0A0A0A', border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: creandoRestaurante ? 'not-allowed' : 'pointer', letterSpacing: '0.5px' }}
            >
              {creandoRestaurante ? 'Creando...' : 'Crear restaurante'}
            </button>

          </div>
        </div>
      )}

      {/* ═══ MODAL USUARIOS ═══ */}
      {modalUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.bg2, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid ' + C.border }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>Usuarios</div>
                <div style={{ fontSize: '11px', color: C.gold, marginTop: '2px' }}>{modalUsuario.nombre}</div>
              </div>
              <button onClick={function() { setModalUsuario(null) }} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>

            {/* Form nuevo usuario */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '12px' }}>NUEVO USUARIO</div>
              <input placeholder="Nombre" value={nuevoUsuario.nombre}
                onChange={function(e) { setNuevoUsuario(function(prev) { return { ...prev, nombre: e.target.value } }) }}
                style={inputStyle} />
              <input placeholder="Email" value={nuevoUsuario.email}
                onChange={function(e) { setNuevoUsuario(function(prev) { return { ...prev, email: e.target.value } }) }}
                style={inputStyle} />
              <input placeholder="Contraseña" value={nuevoUsuario.password}
                onChange={function(e) { setNuevoUsuario(function(prev) { return { ...prev, password: e.target.value } }) }}
                style={inputStyle} />
              <select value={nuevoUsuario.rol}
                onChange={function(e) { setNuevoUsuario(function(prev) { return { ...prev, rol: e.target.value } }) }}
                style={{ ...inputStyle, marginBottom: '12px' }}>
                <option value="cocina">🍳 Cocina</option>
                <option value="mesero">🛎️ Mesero</option>
                <option value="mesas">🪑 Mesas</option>
                <option value="dashboard">📊 Dashboard (Dueño)</option>
              </select>
              <button onClick={crearUsuario}
                style={{ width: '100%', background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '100px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                + Crear usuario
              </button>
            </div>

            {/* Lista usuarios */}
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '10px' }}>USUARIOS ACTUALES</div>
            {loadingUsuarios && <div style={{ textAlign: 'center', color: C.textSub, padding: '20px', fontSize: '13px' }}>Cargando...</div>}
            {usuariosRestaurante.map(function(u) {
              const rolColors = {
                cocina: { color: C.gold, bg: '#1A1400', border: '#C9A84C40' },
                mesero: { color: '#64B5F6', bg: '#0A1520', border: '#1565C040' },
                mesas: { color: '#BA68C8', bg: '#140A1A', border: '#7B1FA240' },
                dashboard: { color: C.green, bg: '#0D2318', border: '#2D6A4F40' },
              }
              const rc = rolColors[u.rol] || { color: C.silver, bg: C.bg2, border: C.border }
              return (
                <div key={u.id} style={{ background: C.card, borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid ' + C.border }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>{u.nombre}</div>
                    <div style={{ fontSize: '11px', color: C.textSub, marginTop: '1px' }}>{u.email}</div>
                    <div style={{ display: 'inline-block', marginTop: '4px', background: rc.bg, border: '1px solid ' + rc.border, borderRadius: '20px', padding: '2px 8px', fontSize: '10px', color: rc.color, fontWeight: '700' }}>
                      {u.rol}
                    </div>
                  </div>
                  <button onClick={function() { eliminarUsuario(u.id) }}
                    style={{ background: '#1A0808', color: C.red, border: '1px solid #C0392B40', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    Eliminar
                  </button>
                </div>
              )
            })}

          </div>
        </div>
      )}

    </div>
  )
}