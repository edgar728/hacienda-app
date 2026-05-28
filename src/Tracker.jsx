import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('https://hacienda-servidor-production.up.railway.app')

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
  fondoInactivo: '#F0EBE6',
}

const PASOS = [
  { estado: 'recibida', label: 'Recibida', emoji: '📋' },
  { estado: 'preparando', label: 'Preparando', emoji: '👨‍🍳' },
  { estado: 'lista', label: '¡Lista!', emoji: '✅' },
]

const MENSAJES = {
  recibida: { titulo: 'Orden recibida', sub: 'Tu orden está en la fila, en breve el chef comienza.' },
  preparando: { titulo: 'El chef está cocinando', sub: 'Paciencia, pronto estará lista tu orden.' },
  lista: { titulo: '¡Tu orden está lista!', sub: 'El mesero va en camino a tu mesa.' },
}

export default function Tracker({ mesa, ordenId }) {
  const [estado, setEstado] = useState('recibida')

  useEffect(() => {
    if (!ordenId) return
    const handler = (data) => {
      if (Number(data.orden_id) === Number(ordenId)) {
        setEstado(data.estado)
      }
    }
    socket.on('estado_actualizado', handler)
    return () => socket.off('estado_actualizado', handler)
  }, [ordenId])

  const pasoActual = PASOS.findIndex(p => p.estado === estado)
  const msg = MENSAJES[estado]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.fondo, minHeight: '100vh', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>
          {estado === 'lista' ? '🎉' : estado === 'preparando' ? '👨‍🍳' : '📋'}
        </div>
        <div style={{ fontSize: '22px', fontWeight: '700', color: C.textoPrincipal, marginBottom: '6px' }}>
          {msg.titulo}
        </div>
        <div style={{ fontSize: '14px', color: C.textoSecundario }}>{msg.sub}</div>
      </div>

      {/* Tracker */}
      <div style={{ background: C.blanco, borderRadius: '20px', padding: '24px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(44,37,35,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {PASOS.map((paso, i) => (
            <div key={paso.estado} style={{ display: 'flex', alignItems: 'center', flex: i < PASOS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: i < pasoActual ? C.verde : i === pasoActual ? C.blanco : C.fondoInactivo,
                  border: i === pasoActual ? `3px solid ${C.verde}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: i < pasoActual ? '14px' : '13px',
                  color: i < pasoActual ? C.blanco : i === pasoActual ? C.verde : C.textoSecundario,
                  fontWeight: '700',
                  boxShadow: i === pasoActual ? `0 0 0 4px rgba(30,94,67,0.15)` : 'none',
                  transition: 'all 0.4s'
                }}>
                  {i < pasoActual ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: i <= pasoActual ? C.textoPrincipal : C.textoSecundario, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {paso.label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div style={{ flex: 1, height: '4px', background: i < pasoActual ? C.verde : C.fondoInactivo, margin: '0 6px', marginBottom: '22px', borderRadius: '2px', transition: 'background 0.4s' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mesa */}
      <div style={{ background: C.blanco, borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: '0 4px 12px rgba(44,37,35,0.04)' }}>
        <div style={{ fontSize: '12px', color: C.textoSecundario, marginBottom: '4px' }}>Tu mesa</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: C.textoPrincipal }}>Mesa {mesa}</div>
        {estado === 'lista' && (
          <div style={{ marginTop: '12px', background: '#E8F5EE', borderRadius: '10px', padding: '10px', fontSize: '13px', color: C.verde, fontWeight: '600' }}>
            🛎️ El mesero viene en camino
          </div>
        )}
      </div>

    </div>
  )
}