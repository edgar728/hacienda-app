import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
  green: '#4CAF50',
  greenDark: '#2D6A4F',
  red: '#E57373',
}

const SERVIDOR = 'https://hacienda-servidor-production.up.railway.app'
const PRECIO = 1200

function diasRestantes(fechaExpira) {
  if (!fechaExpira) return 0
  const diff = new Date(fechaExpira) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Suscripcion({ restaurante }) {
  const [cargando, setCargando] = useState(false)
  const [pagos, setPagos] = useState([])
  const [rest, setRest] = useState(restaurante)

  useEffect(() => {
    cargarDatos()
    const params = new URLSearchParams(window.location.search)
    const paymentId = params.get('payment_id')
    const status = params.get('status')
    if (paymentId && status === 'approved') {
      confirmarPago(paymentId)
    }
  }, [])

  async function cargarDatos() {
    const { data: restData } = await supabase
      .from('restaurantes').select('*').eq('id', restaurante.id).single()
    setRest(restData)
    const { data: pagosData } = await supabase
      .from('pagos').select('*').eq('restaurante_id', restaurante.id)
      .order('created_at', { ascending: false }).limit(6)
    setPagos(pagosData || [])
  }

  async function confirmarPago(paymentId) {
    const { data: existe } = await supabase
      .from('pagos').select('id').eq('mp_payment_id', paymentId).single()
    if (existe) return

    const base = rest?.suscripcion_expira && new Date(rest.suscripcion_expira) > new Date()
      ? new Date(rest.suscripcion_expira)
      : new Date()
    base.setDate(base.getDate() + 30)

    await supabase.from('pagos').insert({
      restaurante_id: restaurante.id,
      mp_payment_id: paymentId,
      monto: PRECIO,
      estado: 'aprobado',
    })

    await supabase.from('restaurantes').update({
      suscripcion_activa: true,
      suscripcion_expira: base.toISOString(),
      ultimo_pago: new Date().toISOString(),
      activo: true,
    }).eq('id', restaurante.id)

    window.history.replaceState({}, '', window.location.pathname)
    await cargarDatos()
  }

  async function pagar() {
    setCargando(true)
    try {
      // Llamada al servidor — el token de MP nunca sale al frontend
      const res = await fetch(`${SERVIDOR}/crear-preferencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurante_id: restaurante.id,
          back_url: window.location.href,
        }),
      })
      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        alert('Error al crear el pago. Intenta de nuevo.')
      }
    } catch (e) {
      alert('Error de conexión. Intenta de nuevo.')
    }
    setCargando(false)
  }

  const dias = diasRestantes(rest?.suscripcion_expira)
  const activa = rest?.suscripcion_activa && dias > 0
  const urgente = dias > 0 && dias <= 5
  const vencida = !activa

  return (
    <div>
      <div style={{
        background: C.card,
        border: '1px solid ' + (activa ? (urgente ? '#C9A84C40' : '#2D6A4F40') : '#C0392B40'),
        borderRadius: '16px', padding: '20px', marginBottom: '12px',
        boxShadow: activa && !urgente ? '0 0 20px #2D6A4F08' : vencida ? '0 0 20px #C0392B08' : 'none',
      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>
              Suscripción Moreno Order
            </div>
            <div style={{ fontSize: '12px', color: C.textSub }}>$1,200 MXN / mes</div>
          </div>
          <div style={{
            background: activa ? (urgente ? '#1A1400' : '#0D2318') : '#1A0808',
            border: '1px solid ' + (activa ? (urgente ? '#C9A84C40' : '#2D6A4F40') : '#C0392B40'),
            borderRadius: '20px', padding: '5px 12px',
            fontSize: '11px', fontWeight: '700',
            color: activa ? (urgente ? C.gold : C.green) : C.red,
          }}>
            {activa ? (urgente ? 'Por vencer' : 'Activa') : 'Vencida'}
          </div>
        </div>

        {activa && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: C.textSub }}>Tiempo restante</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: urgente ? C.gold : C.green }}>
                {dias} {dias === 1 ? 'día' : 'días'}
              </span>
            </div>
            <div style={{ height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: Math.min((dias / 30) * 100, 100) + '%',
                background: urgente
                  ? 'linear-gradient(90deg, ' + C.gold + ', ' + C.goldLight + ')'
                  : 'linear-gradient(90deg, #2D6A4F, #4CAF50)',
                borderRadius: '3px', transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: C.textSub, marginTop: '6px' }}>
              Vence el {formatFecha(rest?.suscripcion_expira)}
            </div>
          </div>
        )}

        {vencida && (
          <div style={{ background: '#1A0808', border: '1px solid #C0392B30', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: C.red, fontWeight: '600', marginBottom: '4px' }}>Tu suscripción ha vencido</div>
            <div style={{ fontSize: '12px', color: C.textSub }}>Renueva para que tus clientes puedan ordenar de nuevo.</div>
          </div>
        )}

        {urgente && (
          <div style={{ background: '#1A1400', border: '1px solid #C9A84C30', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: C.gold, fontWeight: '600', marginBottom: '4px' }}>Tu suscripción vence pronto</div>
            <div style={{ fontSize: '12px', color: C.textSub }}>Renueva ahora para no perder el servicio.</div>
          </div>
        )}

        <button onClick={pagar} disabled={cargando} style={{
          width: '100%',
          background: cargando ? C.border : 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')',
          color: cargando ? C.textSub : '#0A0A0A',
          border: 'none', borderRadius: '100px',
          padding: '14px', fontSize: '14px', fontWeight: '700',
          cursor: cargando ? 'not-allowed' : 'pointer', letterSpacing: '0.5px',
        }}>
          {cargando ? 'Redirigiendo...' : activa ? 'Renovar suscripción — $1,200' : 'Activar suscripción — $1,200'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: C.textSub }}>
          Pago seguro con MercadoPago
        </div>
      </div>

      {pagos.length > 0 && (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '14px' }}>
            HISTORIAL DE PAGOS
          </div>
          {pagos.map(function(p, i) {
            return (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < pagos.length - 1 ? '1px solid ' + C.border : 'none',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Mensualidad</div>
                  <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>{formatFecha(p.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: C.gold }}>${Number(p.monto).toLocaleString()}</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: p.estado === 'aprobado' ? C.green : C.red, marginTop: '2px' }}>
                    {p.estado === 'aprobado' ? 'Pagado' : p.estado}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}