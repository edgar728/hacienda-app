import { useState, useEffect, useRef } from 'react'
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
  en_espera: { color: C.amarillo, bg: '#FEF3E2', label: 'En espera', emoji: '⏳' },
  ocupado: { color: C.rojo, bg: '#FDE8E8', label: 'Ocupado', emoji: '🔴' },
}

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function Mesero() {
  const { slug } = useParams()
  const [tab, setTab] = useState('mesas')
  const [mesas, setMesas] = useState([])
  const [ordenesListas, setOrdenesListas] = useState([])
  const [restauranteId, setRestauranteId] = useState(null)
  const restauranteIdRef = useRef(null)
  const [cargando, setCargando] = useState(true)
  const [modalCuenta, setModalCuenta] = useState(null)
  const [ordenesModal, setOrdenesModal] = useState([])

  useEffect(() => {
    cargarTodo()

    socket.on('mesa_actualizada', (mesa) => {
      setMesas(prev => prev.map(m => m.id === mesa.id ? mesa : m))
    })

    socket.on('estado_actualizado', ({ orden_id, estado, mesa }) => {
      if (estado === 'lista') {
        setTimeout(() => {
          if (restauranteIdRef.current) cargarOrdenesListas(restauranteIdRef.current)
        }, 800)
      } else if (estado === 'entregada') {
        setOrdenesListas(prev => prev.filter(o => o.id !== orden_id))
      }
    })

    return () => {
      socket.off('mesa_actualizada')
      socket.off('orden_recibida')
      socket.off('estado_actualizado')
    }
  }, [slug])

  async function cargarTodo() {
    const { data: rest } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('slug', slug)
      .single()

    setRestauranteId(rest.id)
    restauranteIdRef.current = rest.id

    const { data: mesasData } = await supabase
      .from('mesas')
      .select('*')
      .eq('restaurante_id', rest.id)
      .order('numero')

    setMesas(mesasData || [])
    await cargarOrdenesListas(rest.id)
    setCargando(false)
  }

  async function cargarOrdenesListas(id) {
    if (!id) return
    const { data } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .eq('restaurante_id', id)
      .eq('estado', 'lista')
      .order('created_at', { ascending: true })
    setOrdenesListas(data || [])
  }

  async function cambiarStatusMesa(mesa, nuevoStatus) {
    let codigo = mesa.codigo
    let codigoExpira = mesa.codigo_expira
    let totalAcumulado = mesa.total_acumulado || 0

    if (nuevoStatus === 'en_espera') {
      codigo = generarCodigo()
      const expira = new Date()
      expira.setHours(expira.getHours() + 4)
      codigoExpira = expira.toISOString()
      totalAcumulado = 0
    }

    if (nuevoStatus === 'disponible') {
      codigo = null
      codigoExpira = null
      totalAcumulado = 0
    }

    const { data: updated } = await supabase
      .from('mesas')
      .update({ status: nuevoStatus, codigo, codigo_expira: codigoExpira, total_acumulado: totalAcumulado })
      .eq('id', mesa.id)
      .select()
      .single()

    setMesas(prev => prev.map(m => m.id === mesa.id ? updated : m))
    socket.emit('mesa_actualizada', updated)
  }

  async function marcarEntregada(ordenId, orden, total) {
    await supabase.from('ordenes').update({ estado: 'entregada' }).eq('id', ordenId)

    const mesaNum = orden.mesa
    const { data: mesaData } = await supabase
      .from('mesas')
      .select('*')
      .eq('restaurante_id', restauranteIdRef.current)
      .eq('numero', mesaNum)
      .single()

    if (mesaData) {
      const nuevoTotal = (mesaData.total_acumulado || 0) + total
      const { data: updated } = await supabase
        .from('mesas')
        .update({ total_acumulado: nuevoTotal })
        .eq('id', mesaData.id)
        .select()
        .single()
      setMesas(prev => prev.map(m => m.id === mesaData.id ? updated : m))
    }

    socket.emit('actualizar_estado', { orden_id: ordenId, estado: 'entregada', mesa: mesaNum })
    setOrdenesListas(prev => prev.filter(o => o.id !== ordenId))
  }

  async function abrirCuenta(mesa) {
    const { data } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .eq('restaurante_id', restauranteIdRef.current)
      .eq('mesa', mesa.numero)
      .order('created_at', { ascending: true })

    const ordenesActivas = (data || []).filter(o => o.estado !== 'pagada' && o.estado !== 'disponible')
    setOrdenesModal(ordenesActivas)
    setModalCuenta(mesa)
  }

  async function cobrarMesa(mesa) {
    const ids = ordenesModal.map(o => o.id)
    if (ids.length > 0) {
      await supabase.from('ordenes').update({ estado: 'pagada' }).in('id', ids)
    }
    await cambiarStatusMesa(mesa, 'disponible')
    setModalCuenta(null)
    setOrdenesModal([])
  }

  const totalCuenta = ordenesModal.reduce((acc, o) => acc + Number(o.total), 0)
  const itemsCuenta = {}
  ordenesModal.forEach(o => {
    o.orden_items?.forEach(item => {
      const key = item.nombre
      if (!itemsCuenta[key]) itemsCuenta[key] = { nombre: item.nombre, cantidad: 0, precio: item.precio }
      itemsCuenta[key].cantidad += item.cantidad
    })
  })

  if (cargando) return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '60px', color: C.textoSecundario, background: C.fondo, minHeight: '100vh' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif", maxWidth: '480px', margin: '0 auto', background: C.fondo, minHeight: '100vh' }}>

      <div style={{ background: C.blanco, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(44,37,35,0.04)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: C.textoPrincipal }}>🛎️ Mesero</div>
          <div style={{ fontSize: '12px', color: C.textoSecundario }}>{slug}</div>
        </div>
        {ordenesListas.length > 0 && (
          <div style={{ background: C.rojo, color: C.blanco, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>
            {ordenesListas.length} para entregar
          </div>
        )}
      </div>

      <div style={{ background: C.blanco, display: 'flex', borderBottom: '1px solid #F0EBE6' }}>
        <button
          onClick={() => setTab('mesas')}
          style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: '600', color: tab === 'mesas' ? C.rojo : C.textoSecundario, background: 'transparent', border: 'none', borderBottom: tab === 'mesas' ? `3px solid ${C.rojo}` : '3px solid transparent', cursor: 'pointer' }}
        >
          🪑 Mesas
        </button>
        <button
          onClick={() => setTab('entregas')}
          style={{ flex: 1, padding: '12px', fontSize: '13px', fontWeight: '600', color: tab === 'entregas' ? C.rojo : C.textoSecundario, background: 'transparent', border: 'none', borderBottom: tab === 'entregas' ? `3px solid ${C.rojo}` : '3px solid transparent', cursor: 'pointer' }}
        >
          🍽️ Entregas {ordenesListas.length > 0 && (
            <span style={{ background: C.rojo, color: C.blanco, borderRadius: '20px', padding: '1px 7px', fontSize: '11px', marginLeft: '4px' }}>
              {ordenesListas.length}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: '16px' }}>

        {tab === 'mesas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {mesas.map(mesa => {
              const cfg = STATUS_CONFIG[mesa.status] || STATUS_CONFIG.disponible
              return (
                <div key={mesa.id} style={{ background: C.blanco, borderRadius: '16px', padding: '14px', boxShadow: '0 4px 12px rgba(44,37,35,0.04)', borderTop: `4px solid ${cfg.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: C.textoPrincipal }}>Mesa {mesa.numero}</div>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px' }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>

                  {mesa.status === 'ocupado' && mesa.total_acumulado > 0 && (
                    <div style={{ background: C.fondo, borderRadius: '8px', padding: '6px 10px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: C.textoSecundario }}>Total acumulado</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: C.rojo }}>${mesa.total_acumulado}</span>
                    </div>
                  )}

                  {mesa.status === 'en_espera' && mesa.codigo && (
                    <div style={{ background: '#FEF3E2', borderRadius: '10px', padding: '8px', marginBottom: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: C.amarillo, fontWeight: '600', marginBottom: '2px' }}>CÓDIGO</div>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: C.textoPrincipal, letterSpacing: '4px' }}>{mesa.codigo}</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mesa.status === 'disponible' && (
                      <button onClick={() => cambiarStatusMesa(mesa, 'en_espera')} style={{ width: '100%', background: '#FEF3E2', color: C.amarillo, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        ⏳ Sentar clientes
                      </button>
                    )}
                    {mesa.status === 'en_espera' && (
                      <>
                        <button onClick={() => cambiarStatusMesa(mesa, 'ocupado')} style={{ width: '100%', background: '#FDE8E8', color: C.rojo, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          🔴 Marcar ocupada
                        </button>
                        <button onClick={() => cambiarStatusMesa(mesa, 'disponible')} style={{ width: '100%', background: '#E8F5EE', color: C.verde, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          ✅ Liberar
                        </button>
                      </>
                    )}
                    {mesa.status === 'ocupado' && (
                      <button onClick={() => abrirCuenta(mesa)} style={{ width: '100%', background: C.rojo, color: C.blanco, border: 'none', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        💳 Generar cuenta
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'entregas' && (
          <>
            {ordenesListas.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: C.textoPrincipal, marginBottom: '6px' }}>Todo entregado</div>
                <div style={{ fontSize: '14px', color: C.textoSecundario }}>No hay órdenes listas por entregar</div>
              </div>
            )}
            {ordenesListas.map(o => (
              <div key={o.id} style={{ background: C.blanco, borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(44,37,35,0.06)', borderLeft: `4px solid ${C.verde}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: C.textoPrincipal }}>Mesa {o.mesa}</div>
                    <div style={{ fontSize: '12px', color: C.textoSecundario }}>Orden #{o.id}</div>
                  </div>
                  <div style={{ background: '#E8F5EE', color: C.verde, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>
                    ✓ Lista
                  </div>
                </div>
                <div style={{ borderTop: `1px dashed #E5DFD9`, paddingTop: '10px', marginBottom: '12px' }}>
                  {o.orden_items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textoPrincipal, padding: '3px 0' }}>
                      <span>🍽️ {item.nombre}</span>
                      <span style={{ color: C.textoSecundario }}>x{item.cantidad}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => marcarEntregada(o.id, o, Number(o.total))}
                  style={{ width: '100%', background: C.verde, color: C.blanco, border: 'none', borderRadius: '100px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,94,67,0.25)' }}
                >
                  ✓ Entregar a Mesa {o.mesa}
                </button>
              </div>
            ))}
          </>
        )}

      </div>

      {modalCuenta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,37,35,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.blanco, borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: C.textoPrincipal }}>💳 Cuenta · Mesa {modalCuenta.numero}</div>
                <div style={{ fontSize: '12px', color: C.textoSecundario }}>{ordenesModal.length} órdenes</div>
              </div>
              <button onClick={() => setModalCuenta(null)} style={{ background: C.fondo, border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.textoSecundario }}>✕</button>
            </div>

            <div style={{ background: C.fondo, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: C.textoSecundario, marginBottom: '12px' }}>RESUMEN</div>
              {Object.values(itemsCuenta).map(item => (
                <div key={item.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed #E5DFD9' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: C.textoPrincipal }}>{item.nombre}</div>
                    <div style={{ fontSize: '11px', color: C.textoSecundario }}>${item.precio} c/u</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: C.textoSecundario }}>x{item.cantidad}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.textoPrincipal }}>${item.precio * item.cantidad}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: C.rojo, borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: C.blanco }}>TOTAL</span>
              <span style={{ fontSize: '24px', fontWeight: '700', color: C.blanco }}>${totalCuenta}</span>
            </div>

            <button
              onClick={() => cobrarMesa(modalCuenta)}
              style={{ width: '100%', background: C.verde, color: C.blanco, border: 'none', borderRadius: '100px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,94,67,0.25)' }}
            >
              ✅ Mesa pagada · Liberar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}