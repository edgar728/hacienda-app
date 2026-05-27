import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

const ESTADOS = ['recibida', 'preparando', 'lista']
const COLORES = {
  recibida: { bg: '#E6F1FB', color: '#0C447C', label: 'Nueva' },
  preparando: { bg: '#FAEEDA', color: '#633806', label: 'Preparando' },
  lista: { bg: '#EAF3DE', color: '#27500A', label: 'Lista' },
}

function TarjetaOrden({ orden, onActualizar }) {
  async function cambiarEstado(nuevoEstado) {
    await supabase
      .from('ordenes')
      .update({ estado: nuevoEstado })
      .eq('id', orden.id)

    socket.emit('actualizar_estado', { orden_id: orden.id, estado: nuevoEstado, mesa: orden.mesa })
    onActualizar(orden.id, nuevoEstado)
  }

  const c = COLORES[orden.estado] || COLORES.recibida
  const siguienteEstado = ESTADOS[ESTADOS.indexOf(orden.estado) + 1]

  return (
    <div style={{ background: 'white', border: `2px solid ${c.bg}`, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Mesa {orden.mesa}</span>
          <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>#{orden.id}</span>
        </div>
        <span style={{ background: c.bg, color: c.color, fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px' }}>
          {c.label}
        </span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        {orden.orden_items?.map((item, i) => (
          <div key={i} style={{ fontSize: '13px', color: '#444', padding: '3px 0', borderBottom: '0.5px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
            <span>{item.emoji || '🍽️'} {item.nombre}</span>
            <span style={{ color: '#888' }}>x{item.cantidad}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '500', color: '#27500A' }}>${orden.total}</span>
        {siguienteEstado && (
          <button
            onClick={() => cambiarEstado(siguienteEstado)}
            style={{ background: '#185FA5', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
          >
            {siguienteEstado === 'preparando' ? '👨‍🍳 Iniciar' : '✅ Lista'}
          </button>
        )}
        {!siguienteEstado && (
          <span style={{ fontSize: '12px', color: '#27500A', fontWeight: '500' }}>✅ Entregada</span>
        )}
      </div>
    </div>
  )
}

export default function Cocina() {
  const [ordenes, setOrdenes] = useState([])

  useEffect(() => {
    cargarOrdenes()

    socket.on('orden_recibida', (orden) => {
      setOrdenes(prev => [{ ...orden, orden_items: orden.items }, ...prev])
    })

    socket.on('estado_actualizado', ({ orden_id, estado }) => {
      setOrdenes(prev => prev.map(o => o.id === orden_id ? { ...o, estado } : o))
    })

    return () => {
      socket.off('orden_recibida')
      socket.off('estado_actualizado')
    }
  }, [])

  async function cargarOrdenes() {
    const { data } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .neq('estado', 'lista')
      .order('created_at', { ascending: false })
    setOrdenes(data || [])
  }

  function actualizarEstado(id, estado) {
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado } : o))
  }

  const nuevas = ordenes.filter(o => o.estado === 'recibida')
  const preparando = ordenes.filter(o => o.estado === 'preparando')

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: '#0C447C', color: 'white', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>🍳 Cocina · La Hacienda</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{ordenes.length} órdenes activas</div>
        </div>
        <div style={{ background: '#1D9E75', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '500' }}>
          ● En vivo
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '500', color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            🔵 Nuevas ({nuevas.length})
          </p>
          {nuevas.length === 0 && <div style={{ fontSize: '13px', color: '#bbb', textAlign: 'center', padding: '20px' }}>Sin órdenes nuevas</div>}
          {nuevas.map(o => <TarjetaOrden key={o.id} orden={o} onActualizar={actualizarEstado} />)}
        </div>
        <div>
          <p style={{ fontSize: '11px', fontWeight: '500', color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
            🟡 Preparando ({preparando.length})
          </p>
          {preparando.length === 0 && <div style={{ fontSize: '13px', color: '#bbb', textAlign: 'center', padding: '20px' }}>Nada en preparación</div>}
          {preparando.map(o => <TarjetaOrden key={o.id} orden={o} onActualizar={actualizarEstado} />)}
        </div>
      </div>
    </div>
  )
}