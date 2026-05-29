import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import Cocina from './Cocina'
import Dashboard from './Dashboard'
import Mesero from './Mesero'
import Admin from './Admin'
import Tracker from './Tracker'
import Chatbot from './Chatbot'

const SERVER = 'https://hacienda-servidor-production.up.railway.app'
const socket = io(SERVER)
socket.on('connect', () => console.log('App conectada'))
socket.on('connect_error', (err) => console.log('Error conexión:', err.message))

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
  amarillo: '#EAA135',
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

  useEffect(() => {
    async function cargar() {
      const { data: rest } = await supabase
        .from('restaurantes')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!rest) { setCargando(false); return }
      setRestaurante(rest)

      const { data } = await supabase
        .from('platillos')
        .select('*')
        .eq('restaurante_id', rest.id)
        .eq('activo', true)

      setPlatillos(data || [])
      setCargando(false)
    }
    cargar()
  }, [slug])

  useEffect(() => {
    if (platillos.length > 0) {
      const cats = [...new Set(platillos.map(p => p.categoria))]
      setCategoriaActiva(cats[0])
    }
  }, [platillos])

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
      .select()
      .single()

    const items = Object.entries(carrito).map(([id, cantidad]) => {
      const p = platillos.find(p => p.id === Number(id))
      return { orden_id: orden.id, platillo_id: Number(id), nombre: p.nombre, precio: p.precio, cantidad, categoria: p.categoria }
    })

    await supabase.from('orden_items').insert(items)

    socket.emit('nueva_orden', {
      id: orden.id,
      mesa: Number(mesa),
      total,
      estado: 'recibida',
      items,
      restaurante_id: restaurante.id,
      slug
    })

    setOrdenId(orden.id)
    setOrdenada(true)
  }

  const totalItems = Object.values(carrito).reduce((a, b) => a + b, 0)
  const totalPrecio = Object.entries(carrito).reduce((acc, [id, qty]) => {
    const p = platillos.find(p => p.id === Number(id))
    return acc + (p ? p.precio * qty : 0)
  }, 0)

  const categorias = [...new Set(platillos.map(p => p.categoria))]
  const platillosFiltrados = categoriaActiva
    ? platillos.filter(p => p.categoria === categoriaActiva)
    : platillos

  if (cargando) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px 16px', color: C.textoSecundario, background: C.fondo, minHeight: '100vh' }}>
      Cargando menú...
    </div>
  )

  if (!restaurante) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px 16px', color: C.textoSecundario, background: C.fondo, minHeight: '100vh' }}>
      Restaurante no encontrado
    </div>
  )

  if (ordenada) return <Tracker mesa={mesa} ordenId={ordenId} />

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.fondo, minHeight: '100vh', paddingBottom: totalItems > 0 ? '100px' : '24px' }}>

      {/* Header fijo */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.blanco, boxShadow: '0 2px 8px rgba(44,37,35,0.04)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: C.textoPrincipal }}>{restaurante.nombre}</div>
        <div style={{ background: C.verde, color: C.blanco, fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '20px' }}>
          Mesa {mesa}
        </div>
      </div>

      {/* Selector de categorías */}
      <div style={{ background: C.blanco, padding: '0 16px', display: 'flex', gap: '4px', overflowX: 'auto', borderBottom: '1px solid #F0EBE6' }}>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{
              padding: '14px 4px',
              fontSize: '14px',
              fontWeight: '600',
              color: categoriaActiva === cat ? C.rojo : C.textoSecundario,
              background: 'transparent',
              border: 'none',
              borderBottom: categoriaActiva === cat ? `3px solid ${C.rojo}` : '3px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginRight: '16px',
              transition: 'all 0.2s'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de platillos */}
      <div style={{ padding: '16px' }}>
        {platillosFiltrados.map(p => (
          <div key={p.id} style={{ background: C.blanco, borderRadius: '16px', padding: '12px', marginBottom: '12px', display: 'flex', gap: '12px', boxShadow: '0 4px 12px rgba(44,37,35,0.03)', alignItems: 'center' }}>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: C.textoPrincipal, marginBottom: '4px', lineHeight: '1.3' }}>{p.nombre}</div>
              <div style={{ fontSize: '12px', color: C.textoSecundario, marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.descripcion}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: C.rojo }}>${p.precio}</div>
            </div>

            {/* Imagen + control */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '86px', height: '86px', borderRadius: '12px', background: '#F5EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                {p.emoji}
              </div>
              <div style={{ position: 'absolute', bottom: '-8px', right: '-4px' }}>
                {carrito[p.id] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: C.blanco, borderRadius: '100px', padding: '4px 8px', boxShadow: '0 2px 8px rgba(44,37,35,0.15)' }}>
                    <button onClick={() => quitar(p.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: C.rojo, fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: C.textoPrincipal, minWidth: '14px', textAlign: 'center' }}>{carrito[p.id]}</span>
                    <button onClick={() => agregar(p.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: C.rojo, fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => agregar(p.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.blanco, border: 'none', cursor: 'pointer', color: C.rojo, fontWeight: '700', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(44,37,35,0.15)' }}>+</button>
                )}
              </div>
            </div>

          </div>
        ))}

        <Chatbot platillos={platillos} />
      </div>

      {/* Botón flotante */}
      {totalItems > 0 && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '388px', zIndex: 100 }}>
          <div
            onClick={enviarOrden}
            style={{ background: C.rojo, borderRadius: '100px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 8px 24px rgba(200,62,35,0.3)' }}
          >
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 10px', fontSize: '14px', fontWeight: '600', color: C.blanco }}>
              {totalItems} items
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: C.blanco }}>Ordenar</span>
            <span style={{ fontSize: '15px', fontWeight: '600', color: C.blanco }}>${totalPrecio}</span>
          </div>
        </div>
      )}

    </div>
  )
}

function Inicio() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '420px', margin: '0 auto', padding: '32px 16px', textAlign: 'center', background: '#FBF9F6', minHeight: '100vh' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
      <h2 style={{ color: '#C83E23', marginBottom: '8px' }}>OrderIA</h2>
      <p style={{ color: '#8C827E', fontSize: '14px' }}>Sistema de órdenes inteligente para restaurantes</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/r/:slug/mesa/:mesa" element={<MenuMesa />} />
        <Route path="/r/:slug/cocina" element={<Cocina />} />
        <Route path="/r/:slug/dashboard" element={<Dashboard />} />
        <Route path="/r/:slug/mesero" element={<Mesero />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App