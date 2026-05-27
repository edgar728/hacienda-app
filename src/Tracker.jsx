import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('https://hacienda-servidor-production.up.railway.app')

const PASOS = [
  { estado: 'recibida', emoji: '📋', label: 'Recibida' },
  { estado: 'preparando', emoji: '👨‍🍳', label: 'Preparando' },
  { estado: 'lista', emoji: '✅', label: '¡Lista!' },
]

const MENSAJES = {
  recibida: '📋 Tu orden fue recibida, espera un momento...',
  preparando: '👨‍🍳 El chef está preparando tu orden...',
  lista: '🎉 ¡Tu orden está lista! El mesero va en camino.',
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

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '420px', margin: '0 auto', padding: '32px 16px', background: '#f5f5f5', minHeight: '100vh' }}>

      <div style={{ background: '#0C447C', color: 'white', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>Mesa {mesa}</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Tu orden está en camino</div>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          {PASOS.map((paso, i) => (
            <div key={paso.estado} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative' }}>
              {i < PASOS.length - 1 && (
                <div style={{
                  position: 'absolute', top: '20px', left: '60%', width: '80%', height: '3px',
                  background: i < pasoActual ? '#0C447C' : '#f0f0f0',
                  zIndex: 0
                }} />
              )}
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', position: 'relative', zIndex: 1,
                background: i <= pasoActual ? '#0C447C' : '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>
                {paso.emoji}
              </div>
              <span style={{
                fontSize: '11px', textAlign: 'center',
                color: i <= pasoActual ? '#0C447C' : '#aaa',
                fontWeight: i === pasoActual ? '600' : '400'
              }}>
                {paso.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          background: estado === 'lista' ? '#E1F5EE' : '#E6F1FB',
          borderRadius: '10px', padding: '12px', textAlign: 'center',
          fontSize: '13px',
          color: estado === 'lista' ? '#085041' : '#0C447C',
          fontWeight: '500'
        }}>
          {MENSAJES[estado]}
        </div>

      </div>

    </div>
  )
}