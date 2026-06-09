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

const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 1299,
    color: C.silver,
    bg: 'rgba(138,138,138,0.1)',
    border: 'rgba(138,138,138,0.3)',
    mesas: 10,
    usuarios: 3,
    beneficios: ['Hasta 10 mesas', '3 usuarios', 'Menú digital con fotos', 'Sistema de cocina', 'Dashboard de ventas', 'Soporte por email'],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 1799,
    color: C.gold,
    bg: 'rgba(201,168,76,0.1)',
    border: 'rgba(201,168,76,0.3)',
    mesas: 25,
    usuarios: 6,
    popular: true,
    beneficios: ['Hasta 25 mesas', '6 usuarios', 'Menú digital con fotos', 'Sistema de cocina', 'Dashboard avanzado', 'Reportes detallados', 'Soporte prioritario'],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 2499,
    color: '#64B5F6',
    bg: 'rgba(100,181,246,0.1)',
    border: 'rgba(100,181,246,0.3)',
    mesas: 999,
    usuarios: 999,
    beneficios: ['Mesas ilimitadas', 'Usuarios ilimitados', 'Menú digital con fotos', 'Sistema de cocina', 'Dashboard personalizado', 'Reportes avanzados', 'Soporte dedicado 24/7'],
  },
]

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
  const [cargando, setCargando] = useState(null) // id del plan que se está procesando
  const [pagos, setPagos] = useState([])
  const [rest, setRest] = useState(restaurante)
  const [vistaPlanes, setVistaPlanes] = useState(false)

  useEffect(() => {
    cargarDatos()
    const params = new URLSearchParams(window.location.search)
    const paymentId = params.get('payment_id')
    const status = params.get('status')
    const plan = params.get('plan')
    if (paymentId && status === 'approved' && plan) {
      confirmarPago(paymentId, plan)
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

  async function confirmarPago(paymentId, plan) {
    const { data: existe } = await supabase
      .from('pagos').select('id').eq('mp_payment_id', paymentId).single()
    if (existe) return

    const planInfo = PLANES.find(p => p.id === plan)
    if (!planInfo) return

    const base = rest?.suscripcion_expira && new Date(rest.suscripcion_expira) > new Date()
      ? new Date(rest.suscripcion_expira)
      : new Date()
    base.setDate(base.getDate() + 30)

    await supabase.from('pagos').insert({
      restaurante_id: restaurante.id,
      mp_payment_id: paymentId,
      monto: planInfo.precio,
      estado: 'aprobado',
    })

    await supabase.from('restaurantes').update({
      suscripcion_activa: true,
      suscripcion_expira: base.toISOString(),
      ultimo_pago: new Date().toISOString(),
      activo: true,
      plan: plan,
    }).eq('id', restaurante.id)

    window.history.replaceState({}, '', window.location.pathname)
    await cargarDatos()
    setVistaPlanes(false)
  }

  async function pagar(planId) {
    const planInfo = PLANES.find(p => p.id === planId)
    if (!planInfo) return
    setCargando(planId)

    try {
      const backUrl = `${window.location.href}${window.location.href.includes('?') ? '&' : '?'}plan=${planId}`
      const res = await fetch(`${SERVIDOR}/crear-preferencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurante_id: restaurante.id,
          back_url: backUrl,
          plan: planId,
          precio: planInfo.precio,
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
    setCargando(null)
  }

  const dias = diasRestantes(rest?.suscripcion_expira)
  const activa = rest?.suscripcion_activa && dias > 0
  const urgente = dias > 0 && dias <= 5
  const vencida = !activa
  const planActual = PLANES.find(p => p.id === rest?.plan) || PLANES[0]

  // Vista de selección de planes
  if (vistaPlanes) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setVistaPlanes(false)}
          style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>
          ← Volver
        </button>
        <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>Elige tu plan</div>
      </div>

      {PLANES.map(plan => (
        <div key={plan.id} style={{
          background: C.card,
          border: '1px solid ' + (rest?.plan === plan.id ? plan.border : C.border),
          borderRadius: '16px', padding: '20px', marginBottom: '12px',
          position: 'relative',
        }}>
          {plan.popular && (
            <div style={{
              position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
              color: '#0A0A0A', fontSize: '10px', fontWeight: '800',
              padding: '3px 14px', borderRadius: '20px', letterSpacing: '1px',
              whiteSpace: 'nowrap',
            }}>
              MÁS POPULAR
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: plan.color, marginBottom: '4px' }}>{plan.nombre}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: C.text }}>
                ${plan.precio.toLocaleString()}
                <span style={{ fontSize: '12px', color: C.textSub, fontWeight: '400' }}>/mes</span>
              </div>
            </div>
            {rest?.plan === plan.id && activa && (
              <div style={{ background: plan.bg, border: '1px solid ' + plan.border, borderRadius: '20px', padding: '4px 12px', fontSize: '10px', fontWeight: '700', color: plan.color }}>
                Plan actual
              </div>
            )}
          </div>

          {/* Beneficios */}
          <div style={{ marginBottom: '16px' }}>
            {plan.beneficios.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: plan.bg, border: '1px solid ' + plan.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: plan.color }} />
                </div>
                <span style={{ fontSize: '12px', color: C.silver }}>{b}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => pagar(plan.id)}
            disabled={cargando === plan.id}
            style={{
              width: '100%',
              background: cargando === plan.id ? C.border : plan.id === 'pro'
                ? `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`
                : plan.bg,
              color: cargando === plan.id ? C.textSub : plan.id === 'pro' ? '#0A0A0A' : plan.color,
              border: plan.id === 'pro' ? 'none' : '1px solid ' + plan.border,
              borderRadius: '100px', padding: '13px',
              fontSize: '13px', fontWeight: '700',
              cursor: cargando === plan.id ? 'not-allowed' : 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            {cargando === plan.id ? 'Redirigiendo...' :
              rest?.plan === plan.id && activa ? `Renovar ${plan.nombre} — $${plan.precio.toLocaleString()}` :
              `Elegir ${plan.nombre} — $${plan.precio.toLocaleString()}`}
          </button>
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: '11px', color: C.textSub, marginTop: '8px' }}>
        Pago seguro con MercadoPago
      </div>
    </div>
  )

  // Vista principal de suscripción
  return (
    <div>
      <div style={{
        background: C.card,
        border: '1px solid ' + (activa ? (urgente ? '#C9A84C40' : '#2D6A4F40') : '#C0392B40'),
        borderRadius: '16px', padding: '20px', marginBottom: '12px',
      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '4px' }}>
              Suscripción Moreno Order
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: planActual.bg, border: '1px solid ' + planActual.border,
                borderRadius: '20px', padding: '3px 10px',
                fontSize: '11px', fontWeight: '700', color: planActual.color,
              }}>
                Plan {planActual.nombre}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub }}>${planActual.precio.toLocaleString()}/mes</div>
            </div>
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
                  ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`
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
            <div style={{ fontSize: '12px', color: C.textSub }}>Elige un plan para que tus clientes puedan ordenar de nuevo.</div>
          </div>
        )}

        {urgente && (
          <div style={{ background: '#1A1400', border: '1px solid #C9A84C30', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: C.gold, fontWeight: '600', marginBottom: '4px' }}>Tu suscripción vence pronto</div>
            <div style={{ fontSize: '12px', color: C.textSub }}>Renueva ahora para no perder el servicio.</div>
          </div>
        )}

        <button onClick={() => setVistaPlanes(true)} style={{
          width: '100%',
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
          color: '#0A0A0A', border: 'none', borderRadius: '100px',
          padding: '14px', fontSize: '14px', fontWeight: '700',
          cursor: 'pointer', letterSpacing: '0.5px',
        }}>
          {activa ? 'Renovar o cambiar plan' : 'Elegir plan y activar'}
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