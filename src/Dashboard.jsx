import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'

const socket = io('https://hacienda-servidor-production.up.railway.app')
socket.on('connect', () => console.log('Dashboard conectado al servidor'))
socket.on('connect_error', (err) => console.log('Error conexión:', err.message))

export default function Dashboard() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])
  const [platillos, setPlatillos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()

    socket.on('orden_recibida', () => {
      cargarDatos()
    })

    socket.on('estado_actualizado', () => {
      cargarDatos()
    })

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

    setOrdenes(ordenesData || [])
    setPlatillos(platillosData || [])
    setCargando(false)
  }

  async function togglePlatillo(id, activo) {
    await supabase.from('platillos').update({ activo: !activo }).eq('id', id)
    setPlatillos(prev => prev.map(p => p.id === id ? { ...p, activo: !activo } : p))
  }

  const ventasHoy = ordenes.reduce((acc, o) => acc + Number(o.total), 0)
  const ordenesHoy = ordenes.length

  const popularidad = {}
  ordenes.forEach(o => {
    o.orden_items?.forEach(item => {
      popularidad[item.nombre] = (popularidad[item.nombre] || 0) + item.cantidad
    })
  })
  const topPlatillos = Object.entries(popularidad).sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (cargando) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px', color: '#888' }}>Cargando...</div>
  )

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>

      <div style={{ background: '#0C447C', color: 'white', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>📊 Dashboard · {slug}</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>Se actualiza en tiempo real</div>
        </div>
        <div style={{ background: '#1D9E75', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '500' }}>
          ● En vivo
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Ventas hoy</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0C447C' }}>${ventasHoy}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Órdenes hoy</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0C447C' }}>{ordenesHoy}</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '12px' }}>🏆 Más pedidos hoy</div>
        {topPlatillos.length === 0 && <div style={{ fontSize: '13px', color: '#bbb' }}>Sin órdenes hoy todavía</div>}
        {topPlatillos.map(([nombre, qty], i) => (
          <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '0.5px solid #f0f0f0' }}>
            <span style={{ fontSize: '13px', color: '#888', width: '16px' }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: '13px', color: '#333' }}>{nombre}</span>
            <div style={{ width: `${(qty / topPlatillos[0][1]) * 60}px`, height: '6px', background: '#185FA5', borderRadius: '3px' }} />
            <span style={{ fontSize: '12px', color: '#888', width: '24px', textAlign: 'right' }}>{qty}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '12px' }}>🍽️ Gestión de menú</div>
        {platillos.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid #f0f0f0' }}>
            <span style={{ fontSize: '20px' }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: p.activo ? '#333' : '#aaa', textDecoration: p.activo ? 'none' : 'line-through' }}>{p.nombre}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>${p.precio}</div>
            </div>
            <button
              onClick={() => togglePlatillo(p.id, p.activo)}
              style={{
                padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500',
                background: p.activo ? '#EAF3DE' : '#f0f0f0',
                color: p.activo ? '#27500A' : '#888'
              }}
            >
              {p.activo ? 'Activo' : 'Pausado'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '12px' }}>📋 Órdenes de hoy</div>
        {ordenes.length === 0 && <div style={{ fontSize: '13px', color: '#bbb' }}>Sin órdenes hoy</div>}
        {ordenes.map(o => (
          <div key={o.id} style={{ padding: '8px 0', borderBottom: '0.5px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Mesa {o.mesa}</span>
              <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>#{o.id}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: o.estado === 'lista' ? '#EAF3DE' : o.estado === 'preparando' ? '#FAEEDA' : '#E6F1FB', color: o.estado === 'lista' ? '#27500A' : o.estado === 'preparando' ? '#633806' : '#0C447C' }}>
                {o.estado}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#27500A' }}>${o.total}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}