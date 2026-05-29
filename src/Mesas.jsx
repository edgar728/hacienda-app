import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabase'
import { io } from 'socket.io-client'

const socket = io('https://hacienda-servidor-production.up.railway.app')

const C = {
  rojo: '#C83E23',
  verde: '#1E5E43',
  amarillo: '#EAA135',
  fondo: '#FBF9F6',
  blanco: '#FFFFFF',
  textoPrincipal: '#2C2523',
  textoSecundario: '#8C827E',
}

const STATUS_CONFIG = {
  disponible: { color: C.verde, bg: '#E8F5EE', label: 'Disponible', emoji: '✅' },
  en_espera:  { color: C.amarillo, bg: '#FEF3E2', label: 'En espera', emoji: '⏳' },
  ocupado:    { color: C.rojo, bg: '#FDE8E8', label: 'Ocupado', emoji: '🔴' },
}

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function Mesas() {
  const { slug } = useParams()
  const [mesas, setMesas] = useState([])
  const [restauranteId, setRestauranteId] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarMesas()

    socket.on('mesa_actualizada', (mesa) => {
      setMesas(prev => prev.map(m => m.id === mesa.id ? mesa : m))
    })

    return () => socket.off('mesa_actualizada')
  }, [slug])

  async function cargarMesas() {
    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('slug', slug)
      .single()

    setRestauranteId(rest.id)

    const { data } = await supabase
      .from('mesas')
      .select('*')
      .eq('restaurante_id', rest.id)
      .order('numero')

    setMesas(data || [])
    setCargando(false)
  }

  async function cambiarStatus(mesa, nuevoStatus) {
    let codigo = mesa.codigo
    let codigoExpira = mesa.codigo_expira

    if (nuevoStatus === 'en_espera') {
      codigo = generarCodigo()
      const expira = new Date()
      expira.setHours(expira.getHours() + 4)
      codigoExpira = expira.toISOString()
    }

    if (nuevoStatus === 'disponible') {
      codigo = null
      codigoExpira = null
    }

    const { data: updated } = await supabase
      .from('mesas')
      .update({ status: nuevoStatus, codigo, codigo_expira: codigoExpira })
      .eq('id', mesa.id)
      .select()
      .single()

    setMesas(prev => prev.map(m => m.id === mesa.id ? updated : m))
    socket.emit('mesa_actualizada', updated)
  }

  if (cargando) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px', color: C.textoSecundario, background: C.fondo, minHeight: '100vh' }}>
      Cargando mesas...
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '480px', margin: '0 auto', background: C.fondo, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: C.blanco, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(44,37,35,0.04)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: C.textoPrincipal }}>🪑 Mesas · {slug}</div>
          <div style={{ fontSize: '12px', color: C.textoSecundario }}>
            {mesas.filter(m => m.status === 'ocupado').length} ocupadas · {mesas.filter(m => m.status === 'disponible').length} disponibles
          </div>
        </div>
        <div style={{ background: C.fondo, borderRadius: '10px', padding: '6px 12px', fontSize: '12px', color: C.textoSecundario, fontWeight: '600' }}>
          {mesas.length} mesas
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {mesas.map(mesa => {
            const cfg = STATUS_CONFIG[mesa.status] || STATUS_CONFIG.disponible
            return (
              <div key={mesa.id} style={{ background: C.blanco, borderRadius: '16px', padding: '14px', boxShadow: '0 4px 12px rgba(44,37,35,0.04)', borderTop: `4px solid ${cfg.color}` }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: C.textoPrincipal }}>Mesa {mesa.numero}</div>
                  <span style={{ background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                </div>

                {mesa.status === 'en_espera' && mesa.codigo && (
                  <div style={{ background: '#FEF3E2', borderRadius: '10px', padding: '10px', marginBottom: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: C.amarillo, fontWeight: '600', marginBottom: '4px' }}>CÓDIGO DE ACCESO</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: C.textoPrincipal, letterSpacing: '4px' }}>{mesa.codigo}</div>
                  </div>
                )}

                {mesa.status === 'ocupado' && mesa.codigo && (
                  <div style={{ background: '#FDE8E8', borderRadius: '10px', padding: '8px', marginBottom: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: C.rojo, fontWeight: '600', marginBottom: '2px' }}>MESA ACTIVA</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: C.rojo, letterSpacing: '3px' }}>{mesa.codigo}</div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {mesa.status === 'disponible' && (
                    <button
                      onClick={() => cambiarStatus(mesa, 'en_espera')}
                      style={{ width: '100%', background: '#FEF3E2', color: C.amarillo, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      ⏳ Poner en espera
                    </button>
                  )}

                  {mesa.status === 'en_espera' && (
                    <>
                      <button
                        onClick={() => cambiarStatus(mesa, 'ocupado')}
                        style={{ width: '100%', background: '#FDE8E8', color: C.rojo, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        🔴 Marcar ocupada
                      </button>
                      <button
                        onClick={() => cambiarStatus(mesa, 'disponible')}
                        style={{ width: '100%', background: '#E8F5EE', color: C.verde, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        ✅ Liberar mesa
                      </button>
                    </>
                  )}

                  {mesa.status === 'ocupado' && (
                    <button
                      onClick={() => cambiarStatus(mesa, 'disponible')}
                      style={{ width: '100%', background: '#E8F5EE', color: C.verde, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      ✅ Liberar mesa
                    </button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}