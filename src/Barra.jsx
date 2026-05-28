import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { io } from 'socket.io-client'

const socket = io('https://hacienda-servidor-production.up.railway.app')

export default function Barra() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])

  useEffect(() => {
    cargarOrdenes()

    socket.on('orden_recibida', (orden) => {
      if (orden.slug === slug) {
        const bebidasItems = orden.items.filter(i => i.categoria === 'Bebidas')
        if (bebidasItems.length > 0) {
          setOrdenes(prev => [{ ...orden, orden_items: bebidasItems }, ...prev])
        }
      }
    })

    socket.on('estado_actualizado', ({ orden_id, estado }) => {
      setOrdenes(prev => prev.map(o => o.id === orden_id ? { ...o, estado } : o))
    })

    return () => {
      socket.off('orden_recibida')
      socket.off('estado_actualizado')
    }
  }, [slug])

  async function cargarOrdenes() {
    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('slug', slug)
      .single()

    const { data: ordenesData } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .eq('restaurante_id', rest.id)
      .neq('estado', 'lista')
      .order('created_at', { ascending: false })

    const ordenesConBebidas = (ordenesData || []).filter(o =>
      o.orden_items?.some(i => i.categoria === 'Bebidas')
    ).map(o => ({
      ...o,
      orden_items: o.orden_items.filter(i => i.categoria === 'Bebidas')
    }))

    setOrdenes(ordenesConBebidas)
  }

  async function cambiarEstado(ordenId, nuevoEstado, mesa) {
    await supabase.from('ordenes').update({ estado: nuevoEstado }).eq('id', ordenId)
    socket.emit('actualizar_estado', { orden_id: ordenId, estado: nuevoEstado, mesa })
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: nuevoEstado } : o))
  }

  const nuevas = ordenes.filter(o => o.estado === 'recibida')
  const preparando = ordenes.filter(o => o.estado === 'preparando')

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px', background: '#1a1a2e', minHeight: '100vh' }}>
      <div style={{ background: '#16213e', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px', color: 'white' }}>🍹 Barra · {slug}</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>{ordenes.length} órdenes activas</div>
        </div>
        <div style={{ background: '#1D9E75', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '500', color: 'white' }}>
          ● En vivo
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '500', color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            🔵 Nuevas ({nuevas.length})
          </p>
          {nuevas.length === 0 && <div style={{ fontSize: '13px', color: '#555', textAlign: 'center', padding: '20px' }}>Sin pedidos</div>}
          {nuevas.map(o => (
            <div key={o.id} style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: 'white', fontSize: '14px' }}>Mesa {o.mesa}</span>
                <span style={{ fontSize: '11px', color: '#aaa' }}>#{o.id}</span>
              </div>
              {o.orden_items?.map((item, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#ccc', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🍹 {item.nombre}</span>
                  <span style={{ color: '#aaa' }}>x{item.cantidad}</span>
                </div>
              ))}
              <button
                onClick={() => cambiarEstado(o.id, 'preparando', o.mesa)}
                style={{ width: '100%', marginTop: '10px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '8px', padding: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
              >
                🍹 Preparar
              </button>
            </div>
          ))}
        </div>

        <div>
          <p style={{ fontSize: '11px', fontWeight: '500', color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            🟡 Preparando ({preparando.length})
          </p>
          {preparando.length === 0 && <div style={{ fontSize: '13px', color: '#555', textAlign: 'center', padding: '20px' }}>Nada en barra</div>}
          {preparando.map(o => (
            <div key={o.id} style={{ background: '#16213e', border: '1px solid #e2a000', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', color: 'white', fontSize: '14px' }}>Mesa {o.mesa}</span>
                <span style={{ fontSize: '11px', color: '#aaa' }}>#{o.id}</span>
              </div>
              {o.orden_items?.map((item, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#ccc', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🍹 {item.nombre}</span>
                  <span style={{ color: '#aaa' }}>x{item.cantidad}</span>
                </div>
              ))}
              <button
                onClick={() => cambiarEstado(o.id, 'lista', o.mesa)}
                style={{ width: '100%', marginTop: '10px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', padding: '7px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
              >
                ✅ Listo
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}