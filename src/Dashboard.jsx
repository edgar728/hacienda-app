import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'

const socket = io('https://hacienda-servidor-production.up.railway.app')

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
  success: '#2D6A4F',
  successLight: '#4CAF50',
  red: '#E57373',
}

const EMOJIS = ['🍕','🍔','🌮','🌯','🍜','🍲','🫕','🥗','🥙','🍱','🍣','🥩','🍗','🍖','🥚','🍳','🫔','🥞','🧆','🥘','🍛','🍝','🥣','🍤','🦐','🥑','🫑','🥦','🌽','🥕','🍅','🧅','🧄','🫘','🥐','🥖','🫓','🥨','🧀','🥓','🌭','🥪','🧇','🥜','🍫','🍰','🎂','🧁','🍮','🍭','🍬','🍩','🍪','🍦','🍧','🍨','🥤','🧃','☕','🍵','🧋','🍺','🍷','🍸','🥂','🫗','🍹','🧉']

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
      .from('restaurantes').select('id, nombre').eq('slug', slug).single()
    if (!rest) return
    setRestaurante(rest)

    const { data: ordenesData } = await supabase
      .from('ordenes').select('*, orden_items(*)')
      .eq('restaurante_id', rest.id)
      .gte('created_at', hoy.toISOString())
      .order('created_at', { ascending: false })

    const { data: platillosData } = await supabase
      .from('platillos').select('*')
      .eq('restaurante_id', rest.id).order('categoria')

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
      const { data } = await supabase.from('platillos')
        .update({ nombre: formPlatillo.nombre, descripcion: formPlatillo.descripcion, precio: Number(formPlatillo.precio), categoria: formPlatillo.categoria, emoji: formPlatillo.emoji, activo: formPlatillo.activo })
        .eq('id', editandoPlatillo.id).select().single()
      setPlatillos(prev => prev.map(p => p.id === editandoPlatillo.id ? data : p))
    } else {
      const { data } = await supabase.from('platillos')
        .insert({ nombre: formPlatillo.nombre, descripcion: formPlatillo.descripcion, precio: Number(formPlatillo.precio), categoria: formPlatillo.categoria, emoji: formPlatillo.emoji, activo: formPlatillo.activo, restaurante_id: restaurante.id })
        .select().single()
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
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontSize: '14px', color: C.textSub }}>Cargando...</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📊</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{restaurante?.nombre}</div>
            <div style={{ fontSize: '11px', color: C.gold, letterSpacing: '1px' }}>DASHBOARD</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0D2318', border: '1px solid #2D6A4F40', borderRadius: '20px', padding: '5px 12px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.successLight }} />
          <span style={{ fontSize: '11px', color: C.successLight, fontWeight: '600', letterSpacing: '1px' }}>EN VIVO</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.bg2, display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['resumen', '📊 Resumen'], ['menu', '🍽️ Menú'], ['ordenes', '📋 Órdenes']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '13px 4px', fontSize: '12px', fontWeight: '600', color: tab === id ? C.gold : C.textSub, background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {/* Resumen */}
        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', color: C.textSub, letterSpacing: '1px', marginBottom: '6px' }}>VENTAS HOY</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: C.gold }}>${ventasHoy.toLocaleString()}</div>
              </div>
              <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', color: C.textSub, letterSpacing: '1px', marginBottom: '6px' }}>ÓRDENES HOY</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: C.text }}>{ordenes.length}</div>
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: C.text, letterSpacing: '1px' }}>MÁS PEDIDOS HOY</span>
              </div>
              {topPlatillos.length === 0 && <div style={{ fontSize: '13px', color: C.textSub, textAlign: 'center', padding: '20px' }}>Sin órdenes hoy todavía</div>}
              {topPlatillos.map(([nombre, qty], i) => (
                <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '12px', color: i === 0 ? C.gold : C.textSub, fontWeight: '700', width: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: C.text }}>{nombre}</span>
                  <div style={{ width: `${(qty / topPlatillos[0][1]) * 50}px`, height: '4px', background: i === 0 ? C.gold : C.border, borderRadius: '2px' }} />
                  <span style={{ fontSize: '12px', color: C.textSub, width: '20px', textAlign: 'right' }}>{qty}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Menú */}
        {tab === 'menu' && (
          <>
            <button onClick={abrirNuevoPlatillo}
              style={{ width: '100%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px', letterSpacing: '0.5px' }}>
              + Agregar platillo
            </button>

            {categorias.map(cat => (
              <div key={cat} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
                  <span style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase' }}>{cat}</span>
                </div>
                {platillos.filter(p => p.categoria === cat).map(p => (
                  <div key={p.id} style={{ background: C.card, borderRadius: '14px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${C.border}` }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#1A1400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {p.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: p.activo ? C.text : C.textSub, textDecoration: p.activo ? 'none' : 'line-through' }}>{p.nombre}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: C.gold }}>${p.precio}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      <button onClick={() => togglePlatillo(p.id, p.activo)}
                        style={{ padding: '4px 8px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: p.activo ? '#0D2318' : C.bg2, color: p.activo ? C.successLight : C.textSub, border: `1px solid ${p.activo ? '#2D6A4F40' : C.border}` }}>
                        {p.activo ? 'Activo' : 'Pausado'}
                      </button>
                      <button onClick={() => abrirEditarPlatillo(p)}
                        style={{ padding: '4px 8px', borderRadius: '20px', border: `1px solid ${C.gold}40`, cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: '#1A1400', color: C.gold }}>
                        Editar
                      </button>
                      <button onClick={() => eliminarPlatillo(p.id)}
                        style={{ padding: '4px 8px', borderRadius: '20px', border: '1px solid #C0392B40', cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: '#1A0808', color: C.red }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Órdenes */}
        {tab === 'ordenes' && (
          <div style={{ background: C.card, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: C.text, letterSpacing: '1px' }}>ÓRDENES DE HOY</span>
            </div>
            {ordenes.length === 0 && <div style={{ fontSize: '13px', color: C.textSub, textAlign: 'center', padding: '20px' }}>Sin órdenes hoy</div>}
            {ordenes.map(o => (
              <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Mesa {o.mesa}</span>
                  <span style={{ fontSize: '11px', color: C.textSub, marginLeft: '8px' }}>#{o.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: '700',
                    background: o.estado === 'pagada' ? '#0D2318' : o.estado === 'lista' ? '#0D2318' : o.estado === 'preparando' ? '#1A1400' : '#0A1520',
                    color: o.estado === 'pagada' ? C.successLight : o.estado === 'lista' ? C.successLight : o.estado === 'preparando' ? C.gold : C.silver,
                    border: `1px solid ${o.estado === 'pagada' || o.estado === 'lista' ? '#2D6A4F40' : o.estado === 'preparando' ? C.gold + '40' : C.border}`
                  }}>
                    {o.estado}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: C.gold }}>${o.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal platillo */}
      {modalPlatillo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.bg2, borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, borderBottom: 'none' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>
                {editandoPlatillo ? '✏️ Editar platillo' : '+ Nuevo platillo'}
              </div>
              <button onClick={() => setModalPlatillo(false)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>EMOJI</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '110px', overflowY: 'auto', background: C.bg, borderRadius: '10px', padding: '8px', border: `1px solid ${C.border}` }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setFormPlatillo(prev => ({ ...prev, emoji: e }))}
                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: formPlatillo.emoji === e ? `2px solid ${C.gold}` : '2px solid transparent', background: formPlatillo.emoji === e ? '#1A1400' : 'transparent', fontSize: '18px', cursor: 'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {[
              { label: 'NOMBRE', key: 'nombre', placeholder: 'Ej: Pozole rojo' },
              { label: 'DESCRIPCIÓN', key: 'descripcion', placeholder: 'Ej: Con hominy, lechuga y rábano' },
              { label: 'PRECIO (MXN)', key: 'precio', placeholder: 'Ej: 175', type: 'number' },
              { label: 'CATEGORÍA', key: 'categoria', placeholder: 'Ej: Entradas, Platos fuertes, Bebidas' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>{field.label}</label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formPlatillo[field.key]}
                  onChange={e => setFormPlatillo(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.text, marginBottom: '0' }}
                />
              </div>
            ))}

            <button onClick={guardarPlatillo} disabled={guardando}
              style={{ width: '100%', background: guardando ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: guardando ? C.textSub : '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer', marginTop: '8px', letterSpacing: '0.5px' }}>
              {guardando ? 'Guardando...' : editandoPlatillo ? 'Guardar cambios' : 'Agregar platillo'}
            </button>

          </div>
        </div>
      )}

    </div>
  )
}