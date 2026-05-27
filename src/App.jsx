import Chatbot from './Chatbot'
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import Tracker from './Tracker'

const socket = io('http://localhost:3001')

function MenuMesa() {
  const { mesa } = useParams()
  const [platillos, setPlatillos] = useState([])
  const [carrito, setCarrito] = useState({})
  const [ordenada, setOrdenada] = useState(false)
  const [ordenId, setOrdenId] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarPlatillos() {
      const { data } = await supabase
        .from('platillos')
        .select('*')
        .eq('activo', true)
      setPlatillos(data || [])
      setCargando(false)
    }
    cargarPlatillos()
  }, [])

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
      .insert({ mesa: Number(mesa), estado: 'recibida', total })
      .select()
      .single()

    const items = Object.entries(carrito).map(([id, cantidad]) => {
      const p = platillos.find(p => p.id === Number(id))
      return { orden_id: orden.id, platillo_id: Number(id), nombre: p.nombre, precio: p.precio, cantidad }
    })

    await supabase.from('orden_items').insert(items)

socket.emit('nueva_orden', {
  id: orden.id,
  mesa: Number(mesa),
  total,
  estado: 'recibida',
  items: items
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

  if (cargando) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px 16px', color: '#888' }}>
      Cargando menú...
    </div>
  )

  if (ordenada) return (
    <Tracker mesa={mesa} ordenId={ordenId} />
  )

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '420px', margin: '0 auto', padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>

      <div style={{ background: '#0C447C', color: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>La Hacienda</h2>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Mesa {mesa} · Elige tus platillos</p>
      </div>

      {categorias.map(cat => (
        <div key={cat}>
          <p style={{ fontSize: '11px', fontWeight: '500', color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '16px 0 8px' }}>
            {cat}
          </p>
          {platillos.filter(p => p.categoria === cat).map(p => (
            <div key={p.id} style={{ background: 'white', border: '0.5px solid #ddd', borderRadius: '12px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '28px' }}>{p.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>{p.nombre}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{p.descripcion}</div>
              </div>
              <div style={{ fontWeight: '500', color: '#27500A', fontSize: '13px' }}>${p.precio}</div>
              {carrito[p.id] ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => quitar(p.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f0f0f0', border: 'none', fontSize: '16px', cursor: 'pointer' }}>−</button>
                  <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '16px', textAlign: 'center' }}>{carrito[p.id]}</span>
                  <button onClick={() => agregar(p.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E6F1FB', border: 'none', fontSize: '18px', cursor: 'pointer' }}>+</button>
                </div>
              ) : (
                <button onClick={() => agregar(p.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E6F1FB', border: 'none', fontSize: '18px', cursor: 'pointer' }}>+</button>
              )}
            </div>
          ))}
        </div>
      ))}

<Chatbot platillos={platillos} />
      {totalItems > 0 && (
        <div onClick={enviarOrden} style={{ background: '#185FA5', color: 'white', borderRadius: '12px', padding: '14px 16px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontSize: '14px' }}>🛒 {totalItems} platillo{totalItems > 1 ? 's' : ''}</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Ordenar · ${totalPrecio}</span>
        </div>
      )}

    </div>
  )
}

function Inicio() {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '420px', margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
      <h2 style={{ color: '#0C447C', marginBottom: '8px' }}>La Hacienda</h2>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>Escanea el QR de tu mesa para ordenar</p>
      <p style={{ fontSize: '12px', color: '#aaa' }}>Prueba las mesas:</p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
        {[1,2,3,4,5].map(n => (
          <a key={n} href={`/mesa/${n}`} style={{ background: '#E6F1FB', color: '#0C447C', padding: '8px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: '500', fontSize: '14px' }}>
            Mesa {n}
          </a>
        ))}
      </div>
    </div>
  )
}

import Cocina from './Cocina'
import Dashboard from './Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/mesa/:mesa" element={<MenuMesa />} />
        <Route path="/cocina" element={<Cocina />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}


export default App