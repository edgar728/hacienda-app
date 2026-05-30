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
console.log('Password cargada:', ADMIN_PASSWORD)

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [restaurantes, setRestaurantes] = useState([])
  const [stats, setStats] = useState({})
  const [cargando, setCargando] = useState(false)

  function login() {
    if (password === ADMIN_PASSWORD) {
      setAutenticado(true)
      cargarDatos()
    } else {
      setError('Contraseña incorrecta')
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
        <button onClick={cargarDatos} style={{ background: C.fondo, border: 'none', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: C.textoSecundario, cursor: 'pointer', fontWeight: '600' }}>
          🔄 Actualizar
        </button>
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
    </div>
  )
}