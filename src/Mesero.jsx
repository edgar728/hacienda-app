import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { io } from 'socket.io-client'

const socket = io('https://hacienda-servidor-production.up.railway.app')

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
  amarillo: '#EAA135',
}

export default function Mesero() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])

  useEffect(() => {
    cargarOrdenes()

    socket.on('estado_actualizado', ({ orden_id, estado }) => {
      if (estado === 'lista') {
        cargarOrdenes()
      } else {
        setOrdenes(prev => prev.filter(o => o.id !== orden_id))
      }
    })

    socket.on('orden_recibida', () => cargarOrdenes())

    return () => {
      socket.off('estado_actualizado')
      socket.off('orden_recibida')
    }
  }, [slug])

  async function cargarOrdenes() {
    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('slug', slug)
      .single()

    const { data } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .eq('restaurante_id', rest.id)
      .eq('estado', 'lista')
      .order('created_at', { ascending: true })

    setOrdenes(data || [])
  }

  async function marcarEntregada(ordenId, mesa) {
    await supabase.from('ordenes').update({ estado: 'entregada' }).eq('id', ordenId)
    socket.emit('actualizar_estado', { orden_id: ordenId, estado: 'entregada', mesa })
    setOrdenes(prev => prev.filter(o => o.id !== ordenId))
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.fondo, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.blanco, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(44,37,35,0.04)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: C.textoPrincipal }}>🛎️ Mesero</div>
          <div style={{ fontSize: '12px', color: C.textoSecundario }}>{slug}</div>
        </div>
        <div style={{ background: ordenes.length > 0 ? C.rojo : C.verde, color: C.blanco, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>
          {ordenes.length > 0 ? `${ordenes.length} para entregar` : '✓ Todo entregado'}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {ordenes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: C.textoPrincipal, marginBottom: '6px' }}>Todo entregado</div>
            <div style={{ fontSize: '14px', color: C.textoSecundario }}>No hay órdenes listas por entregar</div>
          </div>
        )}

        {ordenes.map(o => (
          <div key={o.id} style={{ background: C.blanco, borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(44,37,35,0.06)', borderLeft: `4px solid ${C.verde}` }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: C.textoPrincipal }}>Mesa {o.mesa}</div>
                <div style={{ fontSize: '12px', color: C.textoSecundario }}>Orden #{o.id}</div>
              </div>
              <div style={{ background: '#E8F5EE', color: C.verde, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>
                ✓ Lista
              </div>
            </div>

            <div style={{ borderTop: `1px dashed #E5DFD9`, paddingTop: '10px', marginBottom: '14px' }}>
              {o.orden_items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textoPrincipal, padding: '4px 0' }}>
                  <span>{item.emoji || '🍽️'} {item.nombre}</span>
                  <span style={{ color: C.textoSecundario }}>x{item.cantidad}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => marcarEntregada(o.id, o.mesa)}
              style={{ width: '100%', background: C.verde, color: C.blanco, border: 'none', borderRadius: '100px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,94,67,0.25)' }}
            >
              ✓ Entregar a Mesa {o.mesa}
            </button>

          </div>
        ))}

      </div>
    </div>
  )
}