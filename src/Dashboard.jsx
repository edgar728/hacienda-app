import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'

const socket = io('https://hacienda-servidor-production.up.railway.app')
socket.on('connect', () => console.log('Dashboard conectado al servidor'))
socket.on('connect_error', (err) => console.log('Error conexión:', err.message))

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
  azul: '#0C447C',
}

const EMOJIS = ['🍕','🍔','🌮','🌯','🍜','🍲','🫕','🥗','🥙','🍱','🍣','🥩','🍗','🍖','🥚','🍳','🫔','🥞','🧆','🥘','🍛','🍝','🥣','🍤','🦐','🥑','🫑','🥦','🌽','🥕','🍅','🧅','🧄','🫘','🥐','🥖','🫓','🥨','🧀','🥓','🌭','🥪','🥙','🧇','🥜','🍫','🍰','🎂','🧁','🍮','🍭','🍬','🍩','🍪','🍦','🍧','🍨','🥤','🧃','☕','🍵','🧋','🍺','🍷','🍸','🥂','🫗','🍹','🧉']

export default function Dashboard() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])
  const [platillos, setPlatillos] = useState([])
  const [restaurante, setRestaurante] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [modalPlatillo, setModalPlatillo] = useState(false)
  const [editandoPlatillo, setEditandoPlatillo] = useState(null)
  const [formPlatillo, setFormPlatillo] = useState({ nombre: '', descripcion: '', precio: '', categoria: 'Platos fuertes', emoji: '🍽️', activo: true })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
    socket.on('orden_recibida', () => cargarDatos())
    socket.on('estado_actualizado', () => cargarDatos())
    return () => {
      socket.off('orden_recibida')
      socket.off('estado_actualizado')
    }
  }, [])

  async function cargarDatos() {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id, nombre')
      .eq('slug', slug)
      .single()

    if (!rest) return
    setRestaurante(rest)

    const { data: ordenesData } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .eq('restaurante_id', rest.id)
      .gte('created_at', hoy.toISOString())
      .order('created_at', { ascending: false })

    const { data: platillosData } = await supabase
      .from('platillos')
      .select('*')
      .eq('restaurante_id', rest.id)
      .order('categoria')

    setOrdenes(ordenesData || [])
    setPlatillos(platillosData || [])
    setCargando(false)
  }

  async function togglePlatillo(id, activo) {
    await supabase.from('platillos').update({ activo: !activo }).eq('id', id)
    setPlatillos(prev => prev.map(p => p.id === id ? { ...p, activo: !activo } : p))
  }

  function abrirNuevoPlatillo() {
    setEditandoPlatillo(null)
    setFormPlatillo({ nombre: '', descripcion: '', precio: '', categoria: 'Platos fuertes', emoji: '🍽️', activo: true })
    setModalPlatillo(true)
  }

  function abrirEditarPlatillo(p) {
    setEditandoPlatillo(p)
    setFormPlatillo({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, categoria: p.categoria, emoji: p.emoji || '🍽️', activo: p.activo })
    setModalPlatillo(true)
  }

  async function guardarPlatillo() {
    if (!formPlatillo.nombre || !formPlatillo.precio) return
    setGuardando(true)

    if (editandoPlatillo) {
      const { data } = await supabase
        .from('platillos')
        .update({ nombre: formPlatillo.nombre, descripcion: formPlatillo.descripcion, precio: Number(formPlatillo.precio), categoria: formPlatillo.categoria, emoji: formPlatillo.emoji, activo: formPlatillo.activo })
        .eq('id', editandoPlatillo.id)
        .select()
        .single()
      setPlatillos(prev => prev.map(p => p.id === editandoPlatillo.id ? data : p))
    } else {
      const { data } = await supabase
        .from('platillos')
        .insert({ nombre: formPlatillo.nombre, descripcion: formPlatillo.descripcion, precio: Number(formPlatillo.precio), categoria: formPlatillo.categoria, emoji: formPlatillo.emoji, activo: formPlatillo.activo, restaurante_id: restaurante.id })
        .select()
        .single()
      setPlatillos(prev => [...prev, data])
    }

    setModalPlatillo(false)
    setGuardando(false)
  }

  async function eliminarPlatillo(id) {
    if (!confirm('¿Eliminar este platillo?')) return
    await supabase.from('platillos').delete().eq('id', id)
    setPlatillos(prev => prev.filter(p => p.id !== id))
  }

  const ventasHoy = ordenes.reduce((acc, o) => acc + Number(o.total), 0)
  const popularidad = {}
  ordenes.forEach(o => {
    o.orden_items?.forEach(item => {
      popularidad[item.nombre] = (popularidad[item.nombre] || 0) + item.cantidad
    })
  })
  const topPlatillos = Object.entries(popularidad).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const categorias = [...new Set(platillos.map(p => p.categoria))]

  if (cargando) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px', color: C.textoSecundario }}>Cargando...</div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", background: C.fondo, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.azul, color: C.blanco, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '16px' }}>📊 {restaurante?.nombre}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Dashboard</div>
        </div>
        <div style={{ background: '#1D9E75', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '600' }}>● En vivo</div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.blanco, display: 'flex', borderBottom: '1px solid #F0EBE6' }}>
        {[['resumen', '📊 Resumen'], ['menu', '🍽️ Menú'], ['ordenes', '📋 Órdenes']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{ flex: 1, padding: '12px 4px', fontSize: '13px', fontWeight: '600', color: tab === id ? C.rojo : C.textoSecundario, background: 'transparent', border: 'none', borderBottom: tab === id ? `3px solid ${C.rojo}` : '3px solid transparent', cursor: 'pointer' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {/* Tab Resumen */}
        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: C.blanco, borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
                <div style={{ fontSize: '11px', color: C.textoSecundario, marginBottom: '4px' }}>Ventas hoy</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: C.azul }}>${ventasHoy}</div>
              </div>
              <div style={{ background: C.blanco, borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
                <div style={{ fontSize: '11px', color: C.textoSecundario, marginBottom: '4px' }}>Órdenes hoy</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: C.azul }}>{ordenes.length}</div>
              </div>
            </div>

            <div style={{ background: C.blanco, borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: C.textoPrincipal, marginBottom: '12px' }}>🏆 Más pedidos hoy</div>
              {topPlatillos.length === 0 && <div style={{ fontSize: '13px', color: '#bbb' }}>Sin órdenes hoy todavía</div>}
              {topPlatillos.map(([nombre, qty], i) => (
                <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                  <span style={{ fontSize: '13px', color: C.textoSecundario, width: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: C.textoPrincipal }}>{nombre}</span>
                  <div style={{ width: `${(qty / topPlatillos[0][1]) * 60}px`, height: '6px', background: C.rojo, borderRadius: '3px' }} />
                  <span style={{ fontSize: '12px', color: C.textoSecundario, width: '24px', textAlign: 'right' }}>{qty}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab Menú */}
        {tab === 'menu' && (
          <>
            <button
              onClick={abrirNuevoPlatillo}
              style={{ width: '100%', background: C.rojo, color: C.blanco, border: 'none', borderRadius: '100px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' }}
            >
              + Agregar platillo
            </button>

            {categorias.map(cat => (
              <div key={cat} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: C.textoSecundario, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ height: '2px', width: '16px', background: C.rojo, borderRadius: '2px' }} />
                  {cat}
                </div>
                {platillos.filter(p => p.categoria === cat).map(p => (
                  <div key={p.id} style={{ background: C.blanco, borderRadius: '14px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F5EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {p.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: p.activo ? C.textoPrincipal : C.textoSecundario, textDecoration: p.activo ? 'none' : 'line-through' }}>{p.nombre}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: C.rojo }}>${p.precio}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => togglePlatillo(p.id, p.activo)}
                        style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: p.activo ? '#E8F5EE' : '#f0f0f0', color: p.activo ? C.verde : C.textoSecundario }}
                      >
                        {p.activo ? 'Activo' : 'Pausado'}
                      </button>
                      <button
                        onClick={() => abrirEditarPlatillo(p)}
                        style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: '#E6F1FB', color: C.azul }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarPlatillo(p.id)}
                        style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: '#FDE8E8', color: C.rojo }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Tab Órdenes */}
        {tab === 'ordenes' && (
          <div style={{ background: C.blanco, borderRadius: '12px', padding: '14px', boxShadow: '0 2px 8px rgba(44,37,35,0.04)' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: C.textoPrincipal, marginBottom: '12px' }}>📋 Órdenes de hoy</div>
            {ordenes.length === 0 && <div style={{ fontSize: '13px', color: '#bbb' }}>Sin órdenes hoy</div>}
            {ordenes.map(o => (
              <div key={o.id} style={{ padding: '10px 0', borderBottom: '0.5px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: C.textoPrincipal }}>Mesa {o.mesa}</span>
                  <span style={{ fontSize: '11px', color: C.textoSecundario, marginLeft: '8px' }}>#{o.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: o.estado === 'lista' ? '#EAF3DE' : o.estado === 'preparando' ? '#FAEEDA' : '#E6F1FB', color: o.estado === 'lista' ? C.verde : o.estado === 'preparando' ? '#633806' : C.azul }}>
                    {o.estado}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: C.rojo }}>${o.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal platillo */}
      {modalPlatillo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,37,35,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.blanco, borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.textoPrincipal }}>
                {editandoPlatillo ? '✏️ Editar platillo' : '+ Nuevo platillo'}
              </div>
              <button onClick={() => setModalPlatillo(false)} style={{ background: C.fondo, border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.textoSecundario }}>✕</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>EMOJI</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto', background: C.fondo, borderRadius: '10px', padding: '8px' }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setFormPlatillo(prev => ({ ...prev, emoji: e }))}
                    style={{ width: '36px', height: '36px', borderRadius: '8px', border: formPlatillo.emoji === e ? `2px solid ${C.rojo}` : '2px solid transparent', background: formPlatillo.emoji === e ? '#FDE8E8' : 'transparent', fontSize: '20px', cursor: 'pointer' }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>NOMBRE</label>
              <input
                placeholder="Ej: Pozole rojo"
                value={formPlatillo.nombre}
                onChange={e => setFormPlatillo(prev => ({ ...prev, nombre: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>DESCRIPCIÓN</label>
              <input
                placeholder="Ej: Con hominy, lechuga y rábano"
                value={formPlatillo.descripcion}
                onChange={e => setFormPlatillo(prev => ({ ...prev, descripcion: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>PRECIO (MXN)</label>
              <input
                type="number"
                placeholder="Ej: 175"
                value={formPlatillo.precio}
                onChange={e => setFormPlatillo(prev => ({ ...prev, precio: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, display: 'block', marginBottom: '6px' }}>CATEGORÍA</label>
              <input
                placeholder="Ej: Entradas, Platos fuertes, Bebidas, Postres"
                value={formPlatillo.categoria}
                onChange={e => setFormPlatillo(prev => ({ ...prev, categoria: e.target.value }))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E5DFD9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.fondo }}
              />
              <div style={{ fontSize: '11px', color: C.textoSecundario, marginTop: '4px' }}>Escribe la categoría o usa una existente</div>
            </div>

            <button
              onClick={guardarPlatillo}
              disabled={guardando}
              style={{ width: '100%', background: guardando ? '#E5DFD9' : C.rojo, color: C.blanco, border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer' }}
            >
              {guardando ? 'Guardando...' : editandoPlatillo ? 'Guardar cambios' : 'Agregar platillo'}
            </button>

          </div>
        </div>
      )}

    </div>
  )
}