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

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

function diasRestantes(fechaExpira) {
  if (!fechaExpira) return 0
  const diff = new Date(fechaExpira) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [restaurantes, setRestaurantes] = useState([])
  const [stats, setStats] = useState({})
  const [cargando, setCargando] = useState(false)
  const [tab, setTab] = useState('restaurantes')
  const [modalRestaurante, setModalRestaurante] = useState(false)
  const [nuevoRestaurante, setNuevoRestaurante] = useState({ nombre: '', slug: '', descripcion: '', mesas: 10 })
  const [creandoRestaurante, setCreandoRestaurante] = useState(false)
  const [errorRestaurante, setErrorRestaurante] = useState('')
  const [modalUsuario, setModalUsuario] = useState(null)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', password: '', rol: 'cocina' })
  const [usuariosRestaurante, setUsuariosRestaurante] = useState([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [pagos, setPagos] = useState([])
  const [modalPago, setModalPago] = useState(null)

  useEffect(() => {
    const auth = sessionStorage.getItem('orderia_admin')
    if (auth === 'true') { setAutenticado(true); cargarDatos() }
  }, [])

  async function login() {
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'admin_password')
      .single()

    if (data && password === data.valor) {
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
    // Cargar pagos
    const { data: pagosData } = await supabase.from('pagos').select('*, restaurantes(nombre, slug)')
      .order('created_at', { ascending: false })
    setPagos(pagosData || [])
    setCargando(false)
  }

  async function toggleRestaurante(id, activo) {
    await supabase.from('restaurantes').update({ activo: !activo }).eq('id', id)
    setRestaurantes(prev => prev.map(r => r.id === id ? { ...r, activo: !activo } : r))
  }

  async function extenderSuscripcion(restauranteId, dias) {
    const rest = restaurantes.find(r => r.id === restauranteId)
    const base = rest?.suscripcion_expira && new Date(rest.suscripcion_expira) > new Date()
      ? new Date(rest.suscripcion_expira)
      : new Date()
    base.setDate(base.getDate() + dias)
    await supabase.from('restaurantes').update({
      suscripcion_activa: true,
      suscripcion_expira: base.toISOString(),
      ultimo_pago: new Date().toISOString(),
      activo: true,
    }).eq('id', restauranteId)
    await supabase.from('pagos').insert({
      restaurante_id: restauranteId,
      mp_payment_id: 'MANUAL-' + Date.now(),
      monto: 1200,
      estado: 'aprobado',
    })
    await cargarDatos()
    setModalPago(null)
  }

  async function revocarSuscripcion(restauranteId) {
    if (!confirm('¿Desactivar suscripción? El restaurante perderá acceso.')) return
    await supabase.from('restaurantes').update({
      suscripcion_activa: false,
      activo: false,
    }).eq('id', restauranteId)
    await cargarDatos()
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
  const totalPagosHoy = pagos.filter(p => {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    return new Date(p.created_at) >= hoy && p.estado === 'aprobado'
  }).reduce((a, p) => a + Number(p.monto), 0)
  const pagosAprobados = pagos.filter(p => p.estado === 'aprobado')

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!autenticado) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', width: '64px', height: '64px', background: C.card, border: '1px solid ' + C.border, borderRadius: '18px', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '18px' }}>⚡</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: C.text, letterSpacing: '-0.5px' }}>
            Moreno <span style={{ color: C.gold }}>Order</span>
          </div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', letterSpacing: '1px' }}>PANEL DE ADMINISTRACIÓN</div>
        </div>
        <div style={{ background: C.card, borderRadius: '20px', padding: '24px', border: '1px solid ' + C.border }}>
          <input type="password" value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Contraseña de acceso"
            style={{ ...inputStyle, border: '1px solid ' + (error ? C.red : C.border), marginBottom: error ? '6px' : '16px' }}
          />
          {error && <div style={{ fontSize: '12px', color: C.red, marginBottom: '12px' }}>{error}</div>}
          <button onClick={login} style={{ width: '100%', background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
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
          <button onClick={cargarDatos} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', fontSize: '14px', color: C.silver, cursor: 'pointer' }}>↻</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.bg2, display: 'flex', borderBottom: '1px solid ' + C.border }}>
        {[['restaurantes', 'Restaurantes'], ['pagos', 'Pagos']].map(function(t) {
          return (
            <button key={t[0]} onClick={() => setTab(t[0])} style={{
              flex: 1, padding: '13px', fontSize: '13px', fontWeight: '600',
              color: tab === t[0] ? C.gold : C.textSub,
              background: 'transparent', border: 'none',
              borderBottom: tab === t[0] ? '2px solid ' + C.gold : '2px solid transparent',
              cursor: 'pointer',
            }}>{t[1]}</button>
          )
        })}
      </div>

      <div style={{ padding: '16px' }}>

        {/* KPIs globales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Restaurantes', value: restaurantes.length, sub: totalActivos + ' activos', color: C.text, icon: '🏪' },
            { label: 'Órdenes hoy', value: totalOrdenes, sub: 'en todos', color: C.green, icon: '📋' },
            { label: 'Ventas hoy', value: '$' + totalVentas.toLocaleString(), sub: 'total red', color: C.gold, icon: '💰' },
            { label: 'Cobros hoy', value: '$' + totalPagosHoy.toLocaleString(), sub: pagosAprobados.length + ' pagos', color: C.gold, icon: '💳' },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ background: C.card, borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: '1px solid ' + C.border }}>
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: item.color, letterSpacing: '-0.5px' }}>{item.value}</div>
                <div style={{ fontSize: '9px', color: C.textSub, marginTop: '2px' }}>{item.label}</div>
              </div>
            )
          })}
        </div>

        {/* ═══ TAB RESTAURANTES ═══ */}
        {tab === 'restaurantes' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ height: '1px', width: '14px', background: C.gold }} />
              <span style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', textTransform: 'uppercase' }}>Restaurantes</span>
            </div>

            {cargando && <div style={{ textAlign: 'center', padding: '40px', color: C.textSub, fontSize: '14px' }}>Cargando...</div>}

            {restaurantes.map(function(r) {
              const s = stats[r.id] || { ordenes: 0, ventas: 0, activas: 0 }
              const dias = diasRestantes(r.suscripcion_expira)
              const suscActiva = r.suscripcion_activa && dias > 0
              const urgente = dias > 0 && dias <= 5
              return (
                <div key={r.id} style={{ background: C.card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid ' + (suscActiva ? (urgente ? '#C9A84C40' : '#2D6A4F40') : '#C0392B40') }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{r.nombre}</div>
                      <div style={{ fontSize: '10px', color: C.gold, fontFamily: 'monospace', marginTop: '2px' }}>/r/{r.slug}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{
                        background: suscActiva ? (urgente ? '#1A1400' : '#0D2318') : '#1A0808',
                        border: '1px solid ' + (suscActiva ? (urgente ? '#C9A84C40' : '#2D6A4F40') : '#C0392B40'),
                        borderRadius: '20px', padding: '4px 10px',
                        fontSize: '10px', fontWeight: '700',
                        color: suscActiva ? (urgente ? C.gold : C.green) : C.red,
                      }}>
                        {suscActiva ? (urgente ? dias + 'd' : dias + 'd') : 'Vencida'}
                      </div>
                      <button onClick={() => toggleRestaurante(r.id, r.activo)} style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: r.activo ? '#0D2318' : '#1A0808', color: r.activo ? C.green : C.red }}>
                        {r.activo ? 'Activo' : 'Bloqueado'}
                      </button>
                    </div>
                  </div>

                  {/* Barra de suscripción */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: C.textSub }}>Suscripción</span>
                      <span style={{ fontSize: '10px', color: C.textSub }}>
                        {suscActiva ? 'Vence ' + formatFecha(r.suscripcion_expira) : 'Sin suscripción activa'}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: Math.min((dias / 30) * 100, 100) + '%',
                        background: urgente ? 'linear-gradient(90deg, ' + C.gold + ', ' + C.goldLight + ')' : 'linear-gradient(90deg, #2D6A4F, #4CAF50)',
                        borderRadius: '2px',
                      }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    {[
                      { label: 'órdenes', value: s.ordenes, color: C.text },
                      { label: 'activas', value: s.activas, color: C.green },
                      { label: 'ventas', value: '$' + s.ventas.toLocaleString(), color: C.gold },
                    ].map(function(stat) {
                      return (
                        <div key={stat.label} style={{ background: C.bg2, borderRadius: '8px', padding: '6px', textAlign: 'center', border: '1px solid ' + C.border }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                          <div style={{ fontSize: '9px', color: C.textSub }}>{stat.label}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    <button onClick={() => setModalPago(r)} style={{ background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '10px', padding: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                      Gestionar pago
                    </button>
                    <button onClick={() => abrirModalUsuarios(r)} style={{ background: C.bg2, color: C.silver, border: '1px solid ' + C.border, borderRadius: '10px', padding: '9px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Usuarios
                    </button>
                  </div>

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
                          style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '6px 4px', textAlign: 'center', fontSize: '10px', color: C.silver, textDecoration: 'none', fontWeight: '500', display: 'block' }}>
                          <div style={{ fontSize: '13px', marginBottom: '2px' }}>{link.icon}</div>
                          {link.label}
                        </a>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
        )}

        {/* ═══ TAB PAGOS ═══ */}
        {tab === 'pagos' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ height: '1px', width: '14px', background: C.gold }} />
              <span style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', textTransform: 'uppercase' }}>Historial de pagos</span>
            </div>

            {/* Resumen de suscripciones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Al corriente', value: restaurantes.filter(r => r.suscripcion_activa && diasRestantes(r.suscripcion_expira) > 5).length, color: C.green },
                { label: 'Por vencer', value: restaurantes.filter(r => r.suscripcion_activa && diasRestantes(r.suscripcion_expira) <= 5 && diasRestantes(r.suscripcion_expira) > 0).length, color: C.gold },
                { label: 'Vencidas', value: restaurantes.filter(r => !r.suscripcion_activa || diasRestantes(r.suscripcion_expira) === 0).length, color: C.red },
              ].map(function(item) {
                return (
                  <div key={item.label} style={{ background: C.card, borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>{item.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Lista de pagos */}
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '14px' }}>TODOS LOS PAGOS</div>
              {pagos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: C.textSub }}>Sin pagos registrados</div>
              )}
              {pagos.map(function(p, i) {
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < pagos.length - 1 ? '1px solid ' + C.border : 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>
                        {p.restaurantes?.nombre || 'Restaurante'}
                      </div>
                      <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>
                        {formatFecha(p.created_at)}
                        {p.mp_payment_id?.startsWith('MANUAL') ? ' · Manual' : ' · MercadoPago'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: C.gold }}>${Number(p.monto).toLocaleString()}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: p.estado === 'aprobado' ? C.green : C.red, marginTop: '2px' }}>
                        {p.estado === 'aprobado' ? 'Aprobado' : p.estado}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {/* ═══ MODAL GESTIONAR PAGO ═══ */}
      {modalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.bg2, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px', border: '1px solid ' + C.border }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>Gestionar pago</div>
                <div style={{ fontSize: '11px', color: C.gold, marginTop: '2px' }}>{modalPago.nombre}</div>
              </div>
              <button onClick={() => setModalPago(null)} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>

            {/* Estado actual */}
            <div style={{ background: C.card, borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: C.textSub }}>Estado actual</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: modalPago.suscripcion_activa ? C.green : C.red }}>
                  {modalPago.suscripcion_activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: C.textSub }}>Vence</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: C.text }}>{formatFecha(modalPago.suscripcion_expira)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: C.textSub }}>Días restantes</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: C.gold }}>{diasRestantes(modalPago.suscripcion_expira)} días</span>
              </div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textSub, letterSpacing: '1.5px', marginBottom: '10px' }}>AGREGAR TIEMPO</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {[[30, '1 mes'], [60, '2 meses'], [90, '3 meses']].map(function(op) {
                return (
                  <button key={op[0]} onClick={() => extenderSuscripcion(modalPago.id, op[0])}
                    style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: C.gold }}>{op[1]}</div>
                    <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>+{op[0]}d</div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => revocarSuscripcion(modalPago.id)}
              style={{ width: '100%', background: '#1A0808', color: C.red, border: '1px solid #C0392B40', borderRadius: '100px', padding: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              Revocar suscripción
            </button>

          </div>
        </div>
      )}

      {/* ═══ MODAL NUEVO RESTAURANTE ═══ */}
      {modalRestaurante && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.bg2, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', border: '1px solid ' + C.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>Nuevo restaurante</div>
              <button onClick={() => { setModalRestaurante(false); setErrorRestaurante('') }} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>
            <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>NOMBRE</label>
            <input placeholder="Ej: La Hacienda" value={nuevoRestaurante.nombre}
              onChange={e => { const nombre = e.target.value; const slugAuto = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); setNuevoRestaurante(prev => ({ ...prev, nombre, slug: slugAuto })); setErrorRestaurante('') }}
              style={inputStyle} />
            <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>SLUG</label>
            <div style={{ display: 'flex', alignItems: 'center', background: C.bg, borderRadius: '10px', border: '1px solid ' + C.border, overflow: 'hidden', marginBottom: '8px' }}>
              <span style={{ padding: '11px 10px', fontSize: '12px', color: C.textSub }}>/r/</span>
              <input placeholder="la-hacienda" value={nuevoRestaurante.slug}
                onChange={e => { setNuevoRestaurante(prev => ({ ...prev, slug: e.target.value })); setErrorRestaurante('') }}
                style={{ flex: 1, padding: '11px 10px 11px 0', border: 'none', fontSize: '14px', outline: 'none', background: 'transparent', color: C.text }} />
            </div>
            <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>DESCRIPCIÓN</label>
            <input placeholder="Ej: Cocina mexicana · GDL" value={nuevoRestaurante.descripcion}
              onChange={e => setNuevoRestaurante(prev => ({ ...prev, descripcion: e.target.value }))} style={inputStyle} />
            <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>NÚMERO DE MESAS</label>
            <input type="number" min="1" max="50" value={nuevoRestaurante.mesas}
              onChange={e => setNuevoRestaurante(prev => ({ ...prev, mesas: Number(e.target.value) }))} style={inputStyle} />
            <div style={{ fontSize: '10px', color: C.textSub, marginBottom: '16px' }}>Se crearán {nuevoRestaurante.mesas} mesas automáticamente</div>
            {errorRestaurante && <div style={{ background: '#1A0808', border: '1px solid #C0392B40', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.red, marginBottom: '14px' }}>{errorRestaurante}</div>}
            <button onClick={crearRestaurante} disabled={creandoRestaurante}
              style={{ width: '100%', background: creandoRestaurante ? C.border : 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: creandoRestaurante ? C.textSub : '#0A0A0A', border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: creandoRestaurante ? 'not-allowed' : 'pointer' }}>
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
              <button onClick={() => setModalUsuario(null)} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '12px' }}>NUEVO USUARIO</div>
              <input placeholder="Nombre" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario(prev => ({ ...prev, nombre: e.target.value }))} style={inputStyle} />
              <input placeholder="Email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario(prev => ({ ...prev, email: e.target.value }))} style={inputStyle} />
              <input placeholder="Contraseña" value={nuevoUsuario.password} onChange={e => setNuevoUsuario(prev => ({ ...prev, password: e.target.value }))} style={inputStyle} />
              <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario(prev => ({ ...prev, rol: e.target.value }))} style={{ ...inputStyle, marginBottom: '12px' }}>
                <option value="cocina">Cocina</option>
                <option value="mesero">Mesero</option>
                <option value="mesas">Mesas</option>
                <option value="dashboard">Dashboard (Dueño)</option>
              </select>
              <button onClick={crearUsuario} style={{ width: '100%', background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '100px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                + Crear usuario
              </button>
            </div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '10px' }}>USUARIOS ACTUALES</div>
            {loadingUsuarios && <div style={{ textAlign: 'center', color: C.textSub, padding: '20px', fontSize: '13px' }}>Cargando...</div>}
            {usuariosRestaurante.map(function(u) {
              const rolColors = { cocina: { color: C.gold, bg: '#1A1400', border: '#C9A84C40' }, mesero: { color: '#64B5F6', bg: '#0A1520', border: '#1565C040' }, mesas: { color: '#BA68C8', bg: '#140A1A', border: '#7B1FA240' }, dashboard: { color: C.green, bg: '#0D2318', border: '#2D6A4F40' } }
              const rc = rolColors[u.rol] || { color: C.silver, bg: C.bg2, border: C.border }
              return (
                <div key={u.id} style={{ background: C.card, borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid ' + C.border }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>{u.nombre}</div>
                    <div style={{ fontSize: '11px', color: C.textSub }}>{u.email}</div>
                    <div style={{ display: 'inline-block', marginTop: '4px', background: rc.bg, border: '1px solid ' + rc.border, borderRadius: '20px', padding: '2px 8px', fontSize: '10px', color: rc.color, fontWeight: '700' }}>{u.rol}</div>
                  </div>
                  <button onClick={() => eliminarUsuario(u.id)} style={{ background: '#1A0808', color: C.red, border: '1px solid #C0392B40', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Eliminar</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}