import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import Cocina from './Cocina'
import Dashboard from './Dashboard'
import Mesero from './Mesero'
import Admin from './Admin'
import Mesas from './Mesas'
import Login from './Login'
import ProtegerRuta from './ProtegerRuta'
import Tracker from './Tracker'
import Chatbot from './Chatbot'

const SERVER = 'https://hacienda-servidor-production.up.railway.app'
const socket = io(SERVER)
socket.on('connect', () => console.log('App conectada'))
socket.on('connect_error', (err) => console.log('Error conexión:', err.message))

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

function MenuMesa() {
  const { slug, mesa } = useParams()
  const [restaurante, setRestaurante] = useState(null)
  const [platillos, setPlatillos] = useState([])
  const [carrito, setCarrito] = useState({})
  const [ordenada, setOrdenada] = useState(false)
  const [ordenId, setOrdenId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState(null)
  const [mesaInfo, setMesaInfo] = useState(null)
  const [codigoIngresado, setCodigoIngresado] = useState('')
  const [codigoError, setCodigoError] = useState('')
  const [codigoVerificado, setCodigoVerificado] = useState(false)

  useEffect(() => {
    async function cargar() {
      const { data: rest } = await supabase
        .from('restaurantes').select('*').eq('slug', slug).single()
      if (!rest) { setCargando(false); return }
      setRestaurante(rest)

      const { data: mesaData } = await supabase
        .from('mesas').select('*')
        .eq('restaurante_id', rest.id).eq('numero', Number(mesa)).single()
      setMesaInfo(mesaData)

      const { data } = await supabase
        .from('platillos').select('*')
        .eq('restaurante_id', rest.id).eq('activo', true)
      setPlatillos(data || [])
      setCargando(false)
    }
    cargar()
  }, [slug, mesa])

  useEffect(() => {
    if (platillos.length > 0) {
      const cats = [...new Set(platillos.map(p => p.categoria))]
      setCategoriaActiva(cats[0])
    }
  }, [platillos])

  useEffect(() => {
    socket.on('mesa_actualizada', (mesaActualizada) => {
      if (mesaActualizada.numero === Number(mesa)) {
        setMesaInfo(mesaActualizada)
        if (mesaActualizada.status === 'disponible') {
          setCodigoVerificado(false)
          setCodigoIngresado('')
        }
      }
    })
    return () => socket.off('mesa_actualizada')
  }, [mesa])

  function verificarCodigo() {
    if (codigoIngresado === mesaInfo.codigo) {
      setCodigoVerificado(true)
    } else {
      setCodigoError('Código incorrecto. Pide el código al mesero.')
    }
  }

  function agregar(id) {
    setCarrito(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  function quitar(id) {
    setCarrito(prev => {
      if (!prev[id] || prev[id] === 1) {
        const nuevo = { ...prev }
        delete nuevo[id]
        return nuevo
      }
      return { ...prev, [id]: prev[id] - 1 }
    })
  }

  async function enviarOrden() {
    const total = Object.entries(carrito).reduce((acc, [id, qty]) => {
      const p = platillos.find(p => p.id === Number(id))
      return acc + (p ? p.precio * qty : 0)
    }, 0)

    const { data: orden } = await supabase
      .from('ordenes')
      .insert({ mesa: Number(mesa), estado: 'recibida', total, restaurante_id: restaurante.id })
      .select().single()

    const items = Object.entries(carrito).map(([id, cantidad]) => {
      const p = platillos.find(p => p.id === Number(id))
      return { orden_id: orden.id, platillo_id: Number(id), nombre: p.nombre, precio: p.precio, cantidad, categoria: p.categoria }
    })

    await supabase.from('orden_items').insert(items)
    socket.emit('nueva_orden', { id: orden.id, mesa: Number(mesa), total, estado: 'recibida', items, restaurante_id: restaurante.id, slug })
    setOrdenId(orden.id)
    setOrdenada(true)
  }

  const totalItems = Object.values(carrito).reduce((a, b) => a + b, 0)
  const totalPrecio = Object.entries(carrito).reduce((acc, [id, qty]) => {
    const p = platillos.find(p => p.id === Number(id))
    return acc + (p ? p.precio * qty : 0)
  }, 0)

  const categorias = [...new Set(platillos.map(p => p.categoria))]
  const platillosFiltrados = categoriaActiva ? platillos.filter(p => p.categoria === categoriaActiva) : platillos

  if (cargando) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🍽️</div>
        <div style={{ fontSize: '14px', color: C.textSub }}>Cargando menú...</div>
      </div>
    </div>
  )

  if (!restaurante) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
        <div style={{ fontSize: '16px', color: C.text, fontWeight: '600' }}>Restaurante no encontrado</div>
      </div>
    </div>
  )

  if (mesaInfo && mesaInfo.status === 'disponible') return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'inline-flex', width: '72px', height: '72px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px' }}>🪑</div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>Mesa no disponible</div>
        <div style={{ fontSize: '14px', color: C.textSub, lineHeight: '1.6' }}>Esta mesa aún no ha sido habilitada.<br />Espera a que el mesero te atienda.</div>
        <div style={{ marginTop: '24px', fontSize: '11px', color: '#2A2A2A', letterSpacing: '1px' }}>MORENO TECHNOLOGY</div>
      </div>
    </div>
  )

  if (mesaInfo && !codigoVerificado) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', width: '64px', height: '64px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>🔐</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: C.text }}>Ingresa el código</div>
          <div style={{ fontSize: '13px', color: C.textSub, marginTop: '6px' }}>
            <span style={{ color: C.gold, fontWeight: '600' }}>{restaurante.nombre}</span> · Mesa {mesa}
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: '20px', padding: '24px', border: `1px solid ${C.border}` }}>
          <input
            type="text"
            value={codigoIngresado}
            onChange={e => { setCodigoIngresado(e.target.value.toUpperCase()); setCodigoError('') }}
            onKeyDown={e => e.key === 'Enter' && verificarCodigo()}
            placeholder="AB12CD"
            maxLength={6}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: `1px solid ${codigoError ? '#C0392B' : C.border}`, fontSize: '28px', fontWeight: '700', letterSpacing: '8px', textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', background: C.bg2, color: C.text, fontFamily: 'monospace' }}
          />
          {codigoError && (
            <div style={{ fontSize: '12px', color: C.red, marginBottom: '12px', textAlign: 'center', background: '#1A0808', padding: '8px', borderRadius: '8px', border: '1px solid #C0392B40' }}>
              {codigoError}
            </div>
          )}
          <button
            onClick={verificarCodigo}
            style={{ width: '100%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', letterSpacing: '0.5px' }}
          >
            Entrar al menú →
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#2A2A2A', letterSpacing: '1px' }}>MORENO TECHNOLOGY</div>
      </div>
    </div>
  )

  if (ordenada) return <Tracker mesa={mesa} ordenId={ordenId} />

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.bg, minHeight: '100vh', paddingBottom: totalItems > 0 ? '100px' : '24px' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '17px', fontWeight: '700', color: C.text }}>{restaurante.nombre}</div>
        <div style={{ background: '#1A1400', color: C.gold, fontSize: '11px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', border: `1px solid ${C.gold}40`, letterSpacing: '0.5px' }}>
          Mesa {mesa}
        </div>
      </div>

      {/* Categorías */}
      <div style={{ background: C.bg2, padding: '0 16px', display: 'flex', gap: '4px', overflowX: 'auto', borderBottom: `1px solid ${C.border}` }}>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{ padding: '13px 4px', fontSize: '13px', fontWeight: '600', color: categoriaActiva === cat ? C.gold : C.textSub, background: 'transparent', border: 'none', borderBottom: categoriaActiva === cat ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginRight: '16px', transition: 'all 0.2s' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Platillos */}
      <div style={{ padding: '16px' }}>
        {platillosFiltrados.map(p => (
          <div key={p.id} style={{ background: C.card, borderRadius: '16px', padding: '12px', marginBottom: '10px', display: 'flex', gap: '12px', border: `1px solid ${C.border}`, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: C.text, marginBottom: '4px', lineHeight: '1.3' }}>{p.nombre}</div>
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.descripcion}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: C.gold }}>${p.precio}</div>
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#1A1400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', border: `1px solid ${C.border}` }}>
                {p.emoji
                ?<img src={p.image} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px' }}></div>
            }
                </div>
              <div style={{ position: 'absolute', bottom: '-8px', right: '-4px' }}>
                {carrito[p.id] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.bg2, borderRadius: '100px', padding: '4px 8px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    <button onClick={() => quitar(p.id)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: C.gold, fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: C.text, minWidth: '14px', textAlign: 'center' }}>{carrito[p.id]}</span>
                    <button onClick={() => agregar(p.id)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', color: C.gold, fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => agregar(p.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.gold, border: 'none', cursor: 'pointer', color: '#0A0A0A', fontWeight: '700', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${C.gold}40` }}>+</button>
                )}
              </div>
            </div>
          </div>
        ))}

        
      </div>

      {/* Botón ordenar */}
      {totalItems > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '388px', zIndex: 100 }}>
          <div
            onClick={enviarOrden}
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, borderRadius: '100px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: `0 8px 24px ${C.gold}40` }}
          >
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '20px', padding: '4px 10px', fontSize: '13px', fontWeight: '700', color: '#0A0A0A' }}>
              {totalItems} items
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0A0A0A' }}>Ordenar</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#0A0A0A' }}>${totalPrecio}</span>
          </div>
        </div>
      )}

    </div>
  )
}

function Inicio() {
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#F5F5F5', marginBottom: '8px' }}>Order Moreno</div>
        <div style={{ fontSize: '12px', color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase' }}>Moreno Technology</div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/r/:slug/mesa/:mesa" element={<MenuMesa />} />
        <Route path="/r/:slug/cocina" element={
          <ProtegerRuta roles={['cocina']}>
            <Cocina />
          </ProtegerRuta>
        } />
        <Route path="/r/:slug/dashboard" element={
          <ProtegerRuta roles={['dashboard']}>
            <Dashboard />
          </ProtegerRuta>
        } />
        <Route path="/r/:slug/mesero" element={
          <ProtegerRuta roles={['mesero']}>
            <Mesero />
          </ProtegerRuta>
        } />
        <Route path="/r/:slug/mesas" element={
          <ProtegerRuta roles={['mesas', 'mesero']}>
            <Mesas />
          </ProtegerRuta>
        } />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App