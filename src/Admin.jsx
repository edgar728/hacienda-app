import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

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
    if (auth === 'true') {
      setAutenticado(true)
      cargarDatos()
    }
  }, [])

  function login() {
    if (password === ADMIN_PASSWORD) {
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
    const { data: rests } = await supabase
      .from('restaurantes')
      .select('*')
      .order('created_at', { ascending: false })

    setRestaurantes(rests || [])

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const statsObj = {}
    for (const r of rests || []) {
      const { data: ordenes } = await supabase
        .from('ordenes')
        .select('total, estado')
        .eq('restaurante_id', r.id)
        .gte('created_at', hoy.toISOString())

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
    if (!nuevoRestaurante.nombre || !nuevoRestaurante.slug) {
      setErrorRestaurante('Nombre y slug son obligatorios')
      return
    }
    setCreandoRestaurante(true)
    setErrorRestaurante('')

    const slugLimpio = nuevoRestaurante.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: rest, error } = await supabase
      .from('restaurantes')
      .insert({ nombre: nuevoRestaurante.nombre, slug: slugLimpio, descripcion: nuevoRestaurante.descripcion })
      .select()
      .single()

    if (error) {
      setErrorRestaurante('El slug ya existe, elige otro')
      setCreandoRestaurante(false)
      return
    }

    const mesas = []
    for (let i = 1; i <= nuevoRestaurante.mesas; i++) {
      mesas.push({ restaurante_id: rest.id, numero: i, status: 'disponible' })
    }
    await supabase.from('mesas').insert(mesas)

    setRestaurantes(prev => [rest, ...prev])
    setModalRestaurante(false)
    setNuevoRestaurante({ nombre: '', slug: '', descripcion: '', mesas: 10 })
    setCreandoRestaurante(false)
  }

  async function abrirModalUsuarios(restaurante) {
    setModalUsuario(restaurante)
    setLoadingUsuarios(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('restaurante_id', restaurante.id)
    setUsuariosRestaurante(data || [])
    setLoadingUsuarios(false)
  }

  async function crearUsuario() {
    if (!nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.password) return
    const { data } = await supabase
      .from('usuarios')
      .insert({
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email.toLowerCase(),
        password: nuevoUsuario.password,
        rol: nuevoUsuario.rol,
        restaurante_id: modalUsuario.id,
        slug: modalUsuario.slug
      })
      .select()
      .single()

    setUsuariosRestaurante(prev => [...prev, data])
    setNuevoUsuario({ nombre: '', email: '', password: '', rol: 'cocina' })
  }

  async function eliminarUsuario(id) {
    await supabase.from('usuarios').delete().eq('id', id)
    setUsuariosRestaurante(prev => prev.filter(u => u.id !== id))
  }

  if (!autenticado) return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.fondo, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: C.textoPrincipal }}>Panel Admin</div>
          <div style={{ fontSize: '14px', color: C.textoSecundario, marginTop: '4px' }}>OrderIA · Solo para administradores</div>
        </div>
        <div style={{ background: C.blanco, borderRadius: '20px', padding: '24px', boxShadow: '0 4px 12px rgba(44,37,35,0.06)' }}>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Contraseña"
            style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `1px solid ${error ? C.rojo : '#E5DFD9'}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', background: C.fondo }}
          />
          {error && <div style={{ fontSize: '12px', color: C.rojo, marginBottom: '8px' }}>{error}</div>}
          <button
            onClick={login}
            style={{ width: '100%', background: C.rojo, color: C.blanco, border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' }}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '480px', margin: '0 auto', background: C.fondo, minHeight: '100vh' }}>

      <div style={{ background: C.blanco, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(44,37,35,0.04)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: C.textoPrincipal }}>⚡ Admin · OrderIA</div>
          <div style={{ fontSize: '12px', color: C.textoSecundario }}>{restaurantes.length} restaurantes</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setModalRestaurante(true)}
            style={{ background: C.rojo, color: C.blanco, border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
          >
            + Restaurante
          </button>
          <button onClick={cargarDatos} style={{ background: C.fondo, border: 'none', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: C.textoSecundario, cursor: 'pointer', fontWeight: '600' }}>
            🔄
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <div style={{ background: C.blanco, borderRadius: '14px', padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: C.rojo }}>{restaurantes.length}</div>
            <div style={{ fontSize: '11px', color: C.textoSecundario, marginTop: '2px' }}>Restaurantes</div>
          </div>
          <div style={{ background: C.blanco, borderRadius: '14px', padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: C.verde }}>
              {Object.values(stats).reduce((a, b) => a + b.ordenes, 0)}
            </div>
            <div style={{ fontSize: '11px', color: C.textoSecundario, marginTop: '2px' }}>Órdenes hoy</div>
          </div>
          <div style={{ background: C.blanco, borderRadius: '14px', padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: C.textoPrincipal }}>
              ${Object.values(stats).reduce((a, b) => a + b.ventas, 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: C.textoSecundario, marginTop: '2px' }}>Ventas hoy</div>
          </div>
        </div>

        <div style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Restaurantes
        </div>

        {cargando && <div style={{ textAlign: 'center', padding: '40px', color: C.textoSecundario }}>Cargando...</div>}

        {restaurantes.map(r => (
          <div key={r.id} style={{ background: C.blanco, borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(44,37,35,0.04)', borderLeft: `4px solid ${r.activo ? C.verde : '#E5DFD9'}` }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: C.textoPrincipal }}>{r.nombre}</div>
                <div style={{ fontSize: '12px', color: C.textoSecundario, marginTop: '2px' }}>{r.descripcion}</div>
                <div style={{ fontSize: '11px', color: C.textoSecundario, marginTop: '4px', fontFamily: 'monospace' }}>/{r.slug}</div>
              </div>
              <button
                onClick={() => toggleRestaurante(r.id, r.activo)}
                style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: r.activo ? '#E8F5EE' : '#FDE8E8', color: r.activo ? C.verde : C.rojo }}
              >
                {r.activo ? 'Activo' : 'Pausado'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div style={{ background: C.fondo, borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: C.textoPrincipal }}>{stats[r.id]?.ordenes || 0}</div>
                <div style={{ fontSize: '10px', color: C.textoSecundario }}>órdenes</div>
              </div>
              <div style={{ background: C.fondo, borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: C.verde }}>{stats[r.id]?.activas || 0}</div>
                <div style={{ fontSize: '10px', color: C.textoSecundario }}>activas</div>
              </div>
              <div style={{ background: C.fondo, borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: C.rojo }}>${(stats[r.id]?.ventas || 0).toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: C.textoSecundario }}>ventas</div>
              </div>
            </div>

            <button
              onClick={() => abrirModalUsuarios(r)}
              style={{ width: '100%', background: C.fondo, color: C.textoPrincipal, border: `1px solid #E5DFD9`, borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '10px' }}
            >
              👥 Gestionar usuarios
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
              {[
                { label: '🍽️ Mesa 1', url: `/r/${r.slug}/mesa/1` },
                { label: '🍳 Cocina', url: `/r/${r.slug}/cocina` },
                { label: '🛎️ Mesero', url: `/r/${r.slug}/mesero` },
                { label: '📊 Dashboard', url: `/r/${r.slug}/dashboard` },
              ].map(link => (
                
                 <a key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: C.fondo, borderRadius: '10px', padding: '8px 4px', textAlign: 'center', fontSize: '11px', color: C.textoPrincipal, textDecoration: 'none', fontWeight: '500', display: 'block' }}
                >
                  {link.label}
                </a>
              ))}
            </div>

          </div>
        ))}

      </div>

      {/* Modal nuevo restaurante */}
      {modalRestaurante && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,37,35,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.blanco, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.textoPrincipal }}>🏪 Nuevo restaurante</div>
              <button onClick={() => { setModalRestaurante(false); setErrorRestaurante('') }} style={{ background: C.fondo, border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.textoSecundario }}>✕</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>NOMBRE DEL RESTAURANTE</label>
              <input
                placeholder="Ej: La Hacienda"
                value={nuevoRestaurante.nombre}
                onChange={e => {
                  const nombre = e.target.value
                  const slugAuto = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  setNuevoRestaurante(prev => ({ ...prev, nombre, slug: slugAuto }))
                  setErrorRestaurante('')
                }}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>SLUG (URL)</label>
              <div style={{ display: 'flex', alignItems: 'center', background: C.fondo, borderRadius: '10px', border: '1px solid #E5DFD9', overflow: 'hidden' }}>
                <span style={{ padding: '12px 10px', fontSize: '13px', color: C.textoSecundario, whiteSpace: 'nowrap' }}>/r/</span>
                <input
                  placeholder="la-hacienda"
                  value={nuevoRestaurante.slug}
                  onChange={e => { setNuevoRestaurante(prev => ({ ...prev, slug: e.target.value })); setErrorRestaurante('') }}
                  style={{ flex: 1, padding: '12px 10px 12px 0', border: 'none', fontSize: '14px', outline: 'none', background: 'transparent' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>DESCRIPCIÓN</label>
              <input
                placeholder="Ej: Cocina mexicana · Providencia, GDL"
                value={nuevoRestaurante.descripcion}
                onChange={e => setNuevoRestaurante(prev => ({ ...prev, descripcion: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>NÚMERO DE MESAS</label>
              <input
                type="number"
                min="1"
                max="50"
                value={nuevoRestaurante.mesas}
                onChange={e => setNuevoRestaurante(prev => ({ ...prev, mesas: Number(e.target.value) }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
              <div style={{ fontSize: '11px', color: C.textoSecundario, marginTop: '4px' }}>Se crearán {nuevoRestaurante.mesas} mesas automáticamente</div>
            </div>

            {errorRestaurante && (
              <div style={{ background: '#FDE8E8', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.rojo, marginBottom: '14px', fontWeight: '500' }}>
                {errorRestaurante}
              </div>
            )}

            <button
              onClick={crearRestaurante}
              disabled={creandoRestaurante}
              style={{ width: '100%', background: creandoRestaurante ? '#E5DFD9' : C.rojo, color: C.blanco, border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: creandoRestaurante ? 'not-allowed' : 'pointer' }}
            >
              {creandoRestaurante ? 'Creando...' : '🏪 Crear restaurante'}
            </button>

          </div>
        </div>
      )}

      {/* Modal usuarios */}
      {modalUsuario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,37,35,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: C.blanco, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: C.textoPrincipal }}>👥 Usuarios</div>
                <div style={{ fontSize: '12px', color: C.textoSecundario }}>{modalUsuario.nombre}</div>
              </div>
              <button onClick={() => setModalUsuario(null)} style={{ background: C.fondo, border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.textoSecundario }}>✕ Cerrar</button>
            </div>

            <div style={{ background: C.fondo, borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, marginBottom: '12px' }}>NUEVO USUARIO</div>
              <input
                placeholder="Nombre"
                value={nuevoUsuario.nombre}
                onChange={e => setNuevoUsuario(prev => ({ ...prev, nombre: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', background: C.blanco }}
              />
              <input
                placeholder="Email"
                value={nuevoUsuario.email}
                onChange={e => setNuevoUsuario(prev => ({ ...prev, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', background: C.blanco }}
              />
              <input
                placeholder="Contraseña"
                value={nuevoUsuario.password}
                onChange={e => setNuevoUsuario(prev => ({ ...prev, password: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', background: C.blanco }}
              />
              <select
                value={nuevoUsuario.rol}
                onChange={e => setNuevoUsuario(prev => ({ ...prev, rol: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px', background: C.blanco }}
              >
                <option value="cocina">🍳 Cocina</option>
                <option value="mesero">🛎️ Mesero</option>
                <option value="mesas">🪑 Mesas</option>
                <option value="dashboard">📊 Dashboard (Dueño)</option>
              </select>
              <button
                onClick={crearUsuario}
                style={{ width: '100%', background: C.rojo, color: C.blanco, border: 'none', borderRadius: '100px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Crear usuario
              </button>
            </div>

            <div style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, marginBottom: '10px' }}>USUARIOS ACTUALES</div>
            {loadingUsuarios && <div style={{ textAlign: 'center', color: C.textoSecundario, padding: '20px' }}>Cargando...</div>}
            {usuariosRestaurante.map(u => (
              <div key={u.id} style={{ background: C.fondo, borderRadius: '12px', padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.textoPrincipal }}>{u.nombre}</div>
                  <div style={{ fontSize: '11px', color: C.textoSecundario }}>{u.email}</div>
                  <div style={{ fontSize: '11px', color: C.rojo, fontWeight: '600', marginTop: '2px' }}>{u.rol}</div>
                </div>
                <button
                  onClick={() => eliminarUsuario(u.id)}
                  style={{ background: '#FDE8E8', color: C.rojo, border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Eliminar
                </button>
              </div>
            ))}

          </div>
        </div>
      )}

    </div>
  )
}