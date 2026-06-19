import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabase'
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

const STATUS_CONFIG = {
  disponible: { color: '#4CAF50', bg: '#0D2318', border: '#2D6A4F40', label: 'Disponible', emoji: '✅' },
  en_espera:  { color: '#C9A84C', bg: '#1A1400', border: '#C9A84C40', label: 'En espera',  emoji: '⏳' },
  ocupado:    { color: '#E57373', bg: '#1A0808', border: '#C0392B40', label: 'Ocupado',    emoji: '🔴' },
}

// ── Sonido de orden lista (2 beeps suaves) ─────────────────────────────────
function sonarOrdenLista() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notas = [660, 880]
    notas.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04)
      gain.gain.linearRampToValueAtTime(0, t + 0.18)
      osc.start(t)
      osc.stop(t + 0.18)
    })
  } catch (e) {}
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
  const [sonidoActivo, setSonidoActivo] = useState(true)
  const sonidoActivoRef = useRef(true)

  useEffect(() => {
    sonidoActivoRef.current = sonidoActivo
  }, [sonidoActivo])

  useEffect(() => {
    cargarTodo()

    socket.on('mesa_actualizada', (mesa) => {
      setMesas(prev => prev.map(m => m.id === mesa.id ? mesa : m))
    })

    socket.on('estado_actualizado', ({ orden_id, estado }) => {
      if (estado === 'lista') {
        if (sonidoActivoRef.current) sonarOrdenLista()
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
    const { data: rest } = await supabase.from('restaurantes').select('id').eq('slug', slug).single()
    setRestauranteId(rest.id)
    restauranteIdRef.current = rest.id
    socket.emit('unirse', rest.id)
    const { data: mesasData } = await supabase.from('mesas').select('*').eq('restaurante_id', rest.id).order('numero')
    setMesas(mesasData || [])
    await cargarOrdenesListas(rest.id)
    setCargando(false)
  }

  async function cargarOrdenesListas(id) {
    if (!id) return
    const { data } = await supabase.from('ordenes').select('*, orden_items(*)')
      .eq('restaurante_id', id).eq('estado', 'lista').order('created_at', { ascending: true })
    setOrdenesListas(data || [])
  }

  async function cambiarStatusMesa(mesa, nuevoStatus) {
    let codigo = mesa.codigo
    let codigoExpira = mesa.codigo_expira
    let totalAcumulado = mesa.total_acumulado || 0
    if (nuevoStatus === 'en_espera') {
      codigo = generarCodigo()
      const expira = new Date(); expira.setHours(expira.getHours() + 4)
      codigoExpira = expira.toISOString(); totalAcumulado = 0
    }
    if (nuevoStatus === 'disponible') { codigo = null; codigoExpira = null; totalAcumulado = 0 }
    const { data: updated } = await supabase.from('mesas')
      .update({ status: nuevoStatus, codigo, codigo_expira: codigoExpira, total_acumulado: totalAcumulado })
      .eq('id', mesa.id).select().single()
    setMesas(prev => prev.map(m => m.id === mesa.id ? updated : m))
    socket.emit('mesa_actualizada', updated)
  }

  async function marcarEntregada(ordenId, orden, total) {
    await supabase.from('ordenes').update({ estado: 'entregada' }).eq('id', ordenId)
    const { data: mesaData } = await supabase.from('mesas').select('*')
      .eq('restaurante_id', restauranteIdRef.current).eq('numero', orden.mesa).single()
    if (mesaData) {
      const nuevoTotal = (mesaData.total_acumulado || 0) + total
      const { data: updated } = await supabase.from('mesas').update({ total_acumulado: nuevoTotal }).eq('id', mesaData.id).select().single()
      setMesas(prev => prev.map(m => m.id === mesaData.id ? updated : m))
    }
    socket.emit('actualizar_estado', { orden_id: ordenId, estado: 'entregada', mesa: orden.mesa })
    setOrdenesListas(prev => prev.filter(o => o.id !== ordenId))
  }

  async function abrirCuenta(mesa) {
    const { data } = await supabase.from('ordenes').select('*, orden_items(*)')
      .eq('restaurante_id', restauranteIdRef.current).eq('mesa', mesa.numero).order('created_at', { ascending: true })
    const ordenesActivas = (data || []).filter(o => o.estado !== 'pagada' && o.estado !== 'disponible')
    setOrdenesModal(ordenesActivas)
    setModalCuenta(mesa)
  }

  async function cobrarMesa(mesa) {
    const ids = ordenesModal.map(o => o.id)
    if (ids.length > 0) await supabase.from('ordenes').update({ estado: 'pagada' }).in('id', ids)
    await cambiarStatusMesa(mesa, 'disponible')
    setModalCuenta(null)
    setOrdenesModal([])
  }

  function imprimirTicket() {
    const fecha = new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const itemsHtml = Object.values(itemsCuenta).map(item => `
      <tr>
        <td style="padding:5px 0;">${item.nombre}</td>
        <td style="text-align:center;padding:5px 8px;">x${item.cantidad}</td>
        <td style="text-align:right;padding:5px 0;">$${item.precio * item.cantidad}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket · Mesa ${modalCuenta.numero}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;color:#000;width:280px;margin:0 auto;padding:20px 8px}.center{text-align:center}.bold{font-weight:bold}.large{font-size:18px}.divider{border-top:1px dashed #000;margin:10px 0}table{width:100%;border-collapse:collapse}td,th{vertical-align:top}.footer{font-size:11px;color:#555;text-align:center;margin-top:10px}@media print{body{width:100%}}</style>
      </head><body>
      <div class="center bold large" style="margin-bottom:2px;">${slug?.toUpperCase()}</div>
      <div class="center" style="font-size:11px;margin-bottom:2px;">Order Moreno</div>
      <div class="center" style="font-size:10px;color:#777;">Moreno Technology</div>
      <div class="divider"></div>
      <div style="margin-bottom:3px;"><span class="bold">Mesa:</span> ${modalCuenta.numero}</div>
      <div style="margin-bottom:3px;"><span class="bold">Fecha:</span> ${fecha}</div>
      <div style="margin-bottom:3px;"><span class="bold">Folio:</span> #${Date.now().toString().slice(-6)}</div>
      <div class="divider"></div>
      <table><thead><tr><th style="text-align:left;padding-bottom:6px;border-bottom:1px solid #000;">Platillo</th><th style="text-align:center;padding-bottom:6px;border-bottom:1px solid #000;">Cant</th><th style="text-align:right;padding-bottom:6px;border-bottom:1px solid #000;">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div class="divider"></div>
      <table><tr><td class="bold" style="font-size:15px;">TOTAL A PAGAR</td><td style="text-align:right;font-size:18px;font-weight:bold;">$${totalCuenta}</td></tr></table>
      <div class="divider"></div>
      <div class="footer"><div style="font-size:13px;font-weight:bold;margin-bottom:4px;">¡Gracias por su visita!</div><div>Powered by Moreno Technology</div></div>
      </body></html>`
    const ventana = window.open('', '_blank', 'width=320,height=600')
    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => ventana.print(), 500)
  }

  const totalCuenta = ordenesModal.reduce((acc, o) => acc + Number(o.total), 0)
  const itemsCuenta = {}
  ordenesModal.forEach(o => {
    o.orden_items?.forEach(item => {
      if (!itemsCuenta[item.nombre]) itemsCuenta[item.nombre] = { nombre: item.nombre, cantidad: 0, precio: item.precio }
      itemsCuenta[item.nombre].cantidad += item.cantidad
    })
  })

  if (cargando) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛎️</div>
        <div style={{ fontSize: '14px', color: C.textSub }}>Cargando...</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }}>

      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🛎️</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>Mesero</div>
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
          {ordenesListas.length > 0 && (
            <div style={{ background: '#1A0808', border: '1px solid #C0392B40', borderRadius: '20px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E57373' }} />
              <span style={{ fontSize: '12px', color: '#E57373', fontWeight: '700' }}>{ordenesListas.length} para entregar</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: C.bg2, display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {[['mesas', '🪑 Mesas'], ['entregas', '🍽️ Entregas']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '14px', fontSize: '13px', fontWeight: '600', color: tab === id ? C.gold : C.textSub, background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer' }}>
            {label}
            {id === 'entregas' && ordenesListas.length > 0 && (
              <span style={{ background: '#E57373', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '10px', marginLeft: '6px', fontWeight: '700' }}>
                {ordenesListas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {tab === 'mesas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {mesas.map(mesa => {
              const cfg = STATUS_CONFIG[mesa.status] || STATUS_CONFIG.disponible
              return (
                <div key={mesa.id} style={{ background: C.card, borderRadius: '16px', padding: '14px', border: `1px solid ${cfg.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: C.text }}>Mesa {mesa.numero}</div>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', border: `1px solid ${cfg.border}` }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  {mesa.status === 'ocupado' && mesa.total_acumulado > 0 && (
                    <div style={{ background: C.bg2, borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '11px', color: C.textSub }}>Total acumulado</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: C.gold }}>${mesa.total_acumulado}</span>
                    </div>
                  )}
                  {mesa.status === 'en_espera' && mesa.codigo && (
                    <div style={{ background: '#1A1400', borderRadius: '10px', padding: '10px', marginBottom: '10px', textAlign: 'center', border: `1px solid ${C.gold}30` }}>
                      <div style={{ fontSize: '10px', color: C.gold, fontWeight: '700', marginBottom: '4px', letterSpacing: '2px' }}>CÓDIGO DE ACCESO</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: C.text, letterSpacing: '6px', fontFamily: 'monospace' }}>{mesa.codigo}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {mesa.status === 'disponible' && (
                      <button onClick={() => cambiarStatusMesa(mesa, 'en_espera')} style={{ width: '100%', background: '#1A1400', color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: '8px', padding: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        ⏳ Sentar clientes
                      </button>
                    )}
                    {mesa.status === 'en_espera' && (
                      <>
                        <button onClick={() => cambiarStatusMesa(mesa, 'ocupado')} style={{ width: '100%', background: '#1A0808', color: '#E57373', border: '1px solid #C0392B40', borderRadius: '8px', padding: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          🔴 Marcar ocupada
                        </button>
                        <button onClick={() => cambiarStatusMesa(mesa, 'disponible')} style={{ width: '100%', background: '#0D2318', color: '#4CAF50', border: '1px solid #2D6A4F40', borderRadius: '8px', padding: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          ✅ Liberar
                        </button>
                      </>
                    )}
                    {mesa.status === 'ocupado' && (
                      <button onClick={() => abrirCuenta(mesa)} style={{ width: '100%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
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
                <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>✅</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: C.text, marginBottom: '6px' }}>Todo entregado</div>
                <div style={{ fontSize: '13px', color: C.textSub }}>No hay órdenes listas por entregar</div>
              </div>
            )}
            {ordenesListas.map(o => (
              <div key={o.id} style={{ background: C.card, borderRadius: '16px', padding: '16px', marginBottom: '12px', border: `1px solid #2D6A4F40` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: C.text }}>Mesa {o.mesa}</div>
                    <div style={{ fontSize: '11px', color: C.textSub }}>Orden #{o.id}</div>
                  </div>
                  <div style={{ background: '#0D2318', color: '#4CAF50', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: '700', border: '1px solid #2D6A4F40' }}>✓ Lista</div>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginBottom: '14px' }}>
                  {o.orden_items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: C.text, padding: '4px 0' }}>
                      <span>🍽️ {item.nombre}</span>
                      <span style={{ color: C.gold, fontWeight: '600', background: C.gold + '15', padding: '2px 8px', borderRadius: '20px', fontSize: '12px' }}>x{item.cantidad}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => marcarEntregada(o.id, o, Number(o.total))}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #2D6A4F, #3D8A6F)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  ✓ Entregar a Mesa {o.mesa}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {modalCuenta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.bg2, borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: C.text }}>💳 Cuenta · Mesa {modalCuenta.numero}</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{ordenesModal.length} órdenes</div>
              </div>
              <button onClick={() => setModalCuenta(null)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', marginBottom: '14px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '12px' }}>RESUMEN</div>
              {Object.values(itemsCuenta).map(item => (
                <div key={item.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: C.text }}>{item.nombre}</div>
                    <div style={{ fontSize: '11px', color: C.textSub }}>${item.precio} c/u · x{item.cantidad}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: C.gold }}>${item.precio * item.cantidad}</div>
                </div>
              ))}
            </div>
            <div style={{ background: `linear-gradient(135deg, ${C.gold}20, ${C.goldLight}10)`, borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${C.gold}40` }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: C.gold, letterSpacing: '1px' }}>TOTAL</span>
              <span style={{ fontSize: '28px', fontWeight: '700', color: C.text }}>${totalCuenta}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={imprimirTicket} style={{ flex: 1, background: C.card, color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                🖨️ Imprimir
              </button>
              <button onClick={() => cobrarMesa(modalCuenta)} style={{ flex: 2, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                ✅ Mesa pagada · Liberar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}