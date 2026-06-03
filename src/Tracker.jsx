import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

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
}

const PASOS = [
  { estado: 'recibida', label: 'Recibida', icon: '📋' },
  { estado: 'preparando', label: 'Preparando', icon: '👨‍🍳' },
  { estado: 'lista', label: '¡Lista!', icon: '✅' },
]

const MENSAJES = {
  recibida: { titulo: 'Orden recibida', sub: 'Tu orden está en la fila, en breve el chef comienza.', icon: '📋' },
  preparando: { titulo: 'El chef está cocinando', sub: 'Paciencia, tu orden está en preparación.', icon: '👨‍🍳' },
  lista: { titulo: '¡Tu orden está lista!', sub: 'El mesero va en camino a tu mesa.', icon: '🎉' },
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
  const msg = MENSAJES[estado] || MENSAJES.recibida

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", maxWidth: '420px', margin: '0 auto', background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: estado === 'lista' ? 'radial-gradient(circle, rgba(45,106,79,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none', transition: 'all 1s' }} />

      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Icono estado */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', width: '80px', height: '80px', background: estado === 'lista' ? '#0D2318' : '#1A1400', border: `1px solid ${estado === 'lista' ? '#2D6A4F40' : C.gold + '40'}`, borderRadius: '24px', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '16px' }}>
            {msg.icon}
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{msg.titulo}</div>
          <div style={{ fontSize: '13px', color: C.textSub, lineHeight: '1.6' }}>{msg.sub}</div>
        </div>

        {/* Tracker */}
        <div style={{ background: C.card, borderRadius: '20px', padding: '20px', marginBottom: '16px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {PASOS.map((paso, i) => (
              <div key={paso.estado} style={{ display: 'flex', alignItems: 'center', flex: i < PASOS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: i < pasoActual ? C.success : i === pasoActual ? '#1A1400' : C.bg2,
                    border: i < pasoActual ? `1px solid #2D6A4F` : i === pasoActual ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: i < pasoActual ? '14px' : '16px',
                    boxShadow: i === pasoActual ? `0 0 16px ${C.gold}30` : 'none',
                    transition: 'all 0.5s'
                  }}>
                    {i < pasoActual ? '✓' : paso.icon}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: i <= pasoActual ? C.text : C.textSub, textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                    {paso.label}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div style={{ flex: 1, height: '2px', background: i < pasoActual ? C.success : C.border, margin: '0 6px', marginBottom: '22px', borderRadius: '2px', transition: 'background 0.5s' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mesa */}
        <div style={{ background: C.card, borderRadius: '16px', padding: '16px', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '11px', color: C.textSub, letterSpacing: '2px', marginBottom: '4px' }}>TU MESA</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: C.text }}>Mesa {mesa}</div>
          {estado === 'lista' && (
            <div style={{ marginTop: '12px', background: '#0D2318', borderRadius: '10px', padding: '10px', fontSize: '13px', color: C.successLight, fontWeight: '600', border: '1px solid #2D6A4F40' }}>
              🛎️ El mesero viene en camino
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#2A2A2A', letterSpacing: '1px' }}>
          MORENO TECHNOLOGY
        </div>

      </div>
    </div>
  )
}