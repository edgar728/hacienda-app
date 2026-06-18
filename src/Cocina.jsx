import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'

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
  successBg: '#0D2318',
}

const ESTADOS = ['recibida', 'preparando', 'lista']

// ── Sonido de nueva orden (3 beeps ascendentes) ────────────────────────────
function sonarNuevaOrden() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notas = [520, 660, 800]
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.4, t + 0.05)
      gain.gain.linearRampToValueAtTime(0, t + 0.15)
      osc.start(t)
      osc.stop(t + 0.15)
    })
  } catch (e) {}
}

function Temporizador({ createdAt }) {
  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    const inicio = new Date(createdAt).getTime()
    const actualizar = () => setSegundos(Math.floor((Date.now() - inicio) / 1000))
    actualizar()
    const interval = setInterval(actualizar, 1000)
    return () => clearInterval(interval)
  }, [createdAt])
  const mins = Math.floor(segundos / 60)
  const segs = segundos % 60
  const urgente = mins >= 15
  const warning = mins >= 8
  return (
    <span style={{ fontSize: '13px', fontWeight: '700', color: urgente ? '#E57373' : warning ? C.gold : C.silver, fontFamily: 'monospace', letterSpacing: '1px' }}>
      {String(mins).padStart(2, '0')}:{String(segs).padStart(2, '0')}
    </span>
  )
}

function TarjetaOrden({ orden, onActualizar }) {
  const siguienteEstado = ESTADOS[ESTADOS.indexOf(orden.estado) + 1]
  const esNueva = orden.estado === 'recibida'

  async function cambiarEstado(nuevoEstado) {
    await supabase.from('ordenes').update({ estado: nuevoEstado }).eq('id', orden.id)
    socket.emit('actualizar_estado', { orden_id: orden.id, estado: nuevoEstado, mesa: orden.mesa })
    onActualizar(orden.id, nuevoEstado)
  }

  return (
    <div style={{ background: C.card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid ${esNueva ? C.gold + '40' : C.border}`, boxShadow: esNueva ? `0 0 20px ${C.gold}15` : 'none', position: 'relative', overflow: 'hidden' }}>
      {esNueva && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700', color: C.text }}>Mesa {orden.mesa}</span>
            {esNueva && <span style={{ background: C.gold, color: '#0A0A0A', fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px' }}>NUEVA</span>}
          </div>
          <span style={{ fontSize: '11px', color: C.textSub }}>#{orden.id}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Temporizador createdAt={orden.created_at} />
          <div style={{ fontSize: '10px', color: C.textSub, marginTop: '2px' }}>tiempo</div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginBottom: '12px' }}>
        {orden.orden_items?.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${C.border}20` }}>
            <span style={{ fontSize: '13px', color: C.text }}>🍽️ {item.nombre}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: C.gold, background: C.gold + '15', padding: '2px 8px', borderRadius: '20px' }}>x{item.cantidad}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: C.silver }}>${orden.total}</span>
        {siguienteEstado && (
          <button onClick={() => cambiarEstado(siguienteEstado)} style={{ background: siguienteEstado === 'preparando' ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})` : 'linear-gradient(135deg, #2D6A4F, #3D8A6F)', color: siguienteEstado === 'preparando' ? '#0A0A0A' : '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            {siguienteEstado === 'preparando' ? '👨‍🍳 Iniciar' : '✅ Lista'}
          </button>
        )}
        {!siguienteEstado && <span style={{ fontSize: '12px', color: C.success, fontWeight: '600' }}>✅ Entregada</span>}
      </div>
    </div>
  )
}

export default function Cocina() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])
  const [sonidoActivo, setSonidoActivo] = useState(true)
  const sonidoActivoRef = useRef(true)

  useEffect(() => {
    sonidoActivoRef.current = sonidoActivo
  }, [sonidoActivo])

  useEffect(() => {
    cargarOrdenes()

    socket.emit('unirse', rest.id)

    socket.on('orden_recibida', (orden) => {
      if (orden.slug !== slug) return
      const itemsSinBebidas = orden.items?.filter(i => i.categoria !== 'Bebidas')
      if (itemsSinBebidas?.length > 0) {
        if (sonidoActivoRef.current) sonarNuevaOrden()
        setOrdenes(prev => [{ ...orden, orden_items: itemsSinBebidas }, ...prev])
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
    const { data: rest } = await supabase.from('restaurantes').select('id').eq('slug', slug).single()
    socket.emit('unirse', rest.id)
    const { data } = await supabase.from('ordenes').select('*, orden_items(*)')
      .eq('restaurante_id', rest.id)
      .neq('estado', 'lista').neq('estado', 'entregada').neq('estado', 'pagada')
      .order('created_at', { ascending: false })
    const ordenesFiltered = (data || []).map(o => ({
      ...o,
      orden_items: o.orden_items?.filter(i => i.categoria !== 'Bebidas')
    })).filter(o => o.orden_items?.length > 0)
    setOrdenes(ordenesFiltered)
  }

  function actualizarEstado(id, estado) {
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado } : o))
  }

  const nuevas = ordenes.filter(o => o.estado === 'recibida')
  const preparando = ordenes.filter(o => o.estado === 'preparando')

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }}>

      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🍳</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>Cocina</div>
            <div style={{ fontSize: '11px', color: C.gold, letterSpacing: '1px' }}>{slug?.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Toggle sonido */}
          <button
            onClick={() => setSonidoActivo(prev => !prev)}
            style={{ background: sonidoActivo ? '#0D2318' : C.card, border: `1px solid ${sonidoActivo ? '#2D6A4F40' : C.border}`, borderRadius: '20px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', color: sonidoActivo ? '#4CAF50' : C.textSub, fontWeight: '600' }}
          >
            {sonidoActivo ? '🔔 Sonido' : '🔕 Mudo'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0D2318', border: `1px solid ${C.success}40`, borderRadius: '20px', padding: '6px 12px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CAF50' }} />
            <span style={{ fontSize: '11px', color: '#4CAF50', fontWeight: '600', letterSpacing: '1px' }}>EN VIVO</span>
          </div>
        </div>
      </div>

      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.gold }} />
          <span style={{ fontSize: '12px', color: C.silver }}>Nuevas</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: C.gold }}>{nuevas.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8A020' }} />
          <span style={{ fontSize: '12px', color: C.silver }}>Preparando</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#E8A020' }}>{preparando.length}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: C.border, minHeight: 'calc(100vh - 110px)' }}>
        <div style={{ background: C.bg, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '3px', height: '16px', background: C.gold, borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase' }}>Nuevas</span>
            <span style={{ background: C.gold + '20', color: C.gold, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>{nuevas.length}</span>
          </div>
          {nuevas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>🍽️</div>
              <div style={{ fontSize: '12px', color: C.textSub }}>Sin órdenes nuevas</div>
            </div>
          )}
          {nuevas.map(o => <TarjetaOrden key={o.id} orden={o} onActualizar={actualizarEstado} />)}
        </div>
        <div style={{ background: C.bg, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '3px', height: '16px', background: '#E8A020', borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#E8A020', letterSpacing: '2px', textTransform: 'uppercase' }}>Preparando</span>
            <span style={{ background: '#E8A02020', color: '#E8A020', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>{preparando.length}</span>
          </div>
          {preparando.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.3 }}>👨‍🍳</div>
              <div style={{ fontSize: '12px', color: C.textSub }}>Nada en preparación</div>
            </div>
          )}
          {preparando.map(o => <TarjetaOrden key={o.id} orden={o} onActualizar={actualizarEstado} />)}
        </div>
      </div>
    </div>
  )
}