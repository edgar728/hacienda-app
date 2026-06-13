import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const C = {
  bg: '#0A0A0A',
  bg2: '#111111',
  card: '#1C1C1C',
  border: '#2A2A2A',
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  text: '#F5F5F5',
  textSub: '#8A8A8A',
  green: '#4CAF50',
}

const WHATSAPP = 'https://wa.me/523332315639?text=Hola,%20me%20interesa%20Moreno%20Order%20para%20mi%20restaurante'

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, visible] = useInView()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style
    }}>
      {children}
    </div>
  )
}

function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#C9A84C" />
      <path d="M8 22 L16 10 L24 22" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="10" r="2.5" fill="#0A0A0A" />
      <path d="M10 22 L22 22" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MockupCocina() {
  return (
    <div style={{ background: '#0A0A0A', borderRadius: '16px', padding: '16px', border: '1px solid #2A2A2A', maxWidth: '320px', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5' }}>Cocina · en vivo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0D2318', borderRadius: '20px', padding: '4px 10px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: '10px', color: '#4CAF50', fontWeight: '600' }}>3 activas</span>
        </div>
      </div>
      {[
        { mesa: 4, items: ['Pozole rojo x2', 'Agua fresca'], tiempo: '03:21', nuevo: true },
        { mesa: 7, items: ['Enchiladas x1', 'Sopa del día'], tiempo: '08:45', nuevo: false },
      ].map((o, i) => (
        <div key={i} style={{ background: '#1C1C1C', borderRadius: '10px', padding: '12px', marginBottom: '8px', border: o.nuevo ? '1px solid #C9A84C40' : '1px solid #2A2A2A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#F5F5F5' }}>Mesa {o.mesa}</span>
              {o.nuevo && <span style={{ background: '#C9A84C', color: '#0A0A0A', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px' }}>NUEVA</span>}
            </div>
            <span style={{ fontSize: '12px', color: o.tiempo > '08:00' ? '#E57373' : '#C9A84C', fontFamily: 'monospace', fontWeight: '700' }}>{o.tiempo}</span>
          </div>
          {o.items.map((item, j) => (
            <div key={j} style={{ fontSize: '12px', color: '#8A8A8A', padding: '2px 0' }}>{item}</div>
          ))}
          <button style={{ width: '100%', marginTop: '10px', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', border: 'none', borderRadius: '8px', padding: '7px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            Iniciar preparación
          </button>
        </div>
      ))}
    </div>
  )
}

function MockupMenu() {
  const [carrito, setCarrito] = useState({})
  const platillos = [
    { id: 1, nombre: 'Pozole rojo', precio: 165, desc: 'Con hominy, lechuga y rábano' },
    { id: 2, nombre: 'Enchiladas verdes', precio: 145, desc: 'Pollo, crema y queso fresco' },
    { id: 3, nombre: 'Agua de jamaica', precio: 45, desc: 'Preparada del día' },
  ]
  return (
    <div style={{ background: '#0A0A0A', borderRadius: '20px', padding: '0', border: '1px solid #2A2A2A', maxWidth: '240px', overflow: 'hidden', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: '#141414', padding: '12px 14px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5' }}>La Hacienda</span>
        <span style={{ background: '#1A1400', color: '#C9A84C', fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', border: '1px solid #C9A84C40' }}>Mesa 3</span>
      </div>
      <div style={{ padding: '10px' }}>
        {platillos.map(p => (
          <div key={p.id} style={{ background: '#1C1C1C', borderRadius: '10px', padding: '10px', marginBottom: '8px', border: '1px solid #2A2A2A', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#F5F5F5', marginBottom: '2px' }}>{p.nombre}</div>
              <div style={{ fontSize: '10px', color: '#6B6B6B', marginBottom: '4px' }}>{p.desc}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#C9A84C' }}>${p.precio}</div>
            </div>
            <div>
              {carrito[p.id] ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => setCarrito(prev => { const n = {...prev}; if (n[p.id] <= 1) delete n[p.id]; else n[p.id]--; return n })} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#C9A84C', fontWeight: '700', fontSize: '14px' }}>−</button>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#F5F5F5' }}>{carrito[p.id]}</span>
                  <button onClick={() => setCarrito(prev => ({...prev, [p.id]: (prev[p.id]||0)+1}))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#C9A84C', fontWeight: '700', fontSize: '14px' }}>+</button>
                </div>
              ) : (
                <button onClick={() => setCarrito(prev => ({...prev, [p.id]: 1}))} style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#C9A84C', border: 'none', cursor: 'pointer', color: '#0A0A0A', fontWeight: '700', fontSize: '16px' }}>+</button>
              )}
            </div>
          </div>
        ))}
        {Object.keys(carrito).length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', borderRadius: '100px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0A0A0A' }}>{Object.values(carrito).reduce((a,b)=>a+b,0)} items</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0A0A0A' }}>Ordenar</span>
          </div>
        )}
      </div>
    </div>
  )
}

const PLANES = [
  { id: 'basico', nombre: 'Básico', precio: 1299, color: '#8A8A8A', mesas: '10 mesas', usuarios: '3 usuarios', limiteMesas: 10, limiteUsuarios: 3, beneficios: ['Menú digital con fotos', 'Sistema de cocina', 'Dashboard de ventas', 'Códigos QR', 'Soporte por email'] },
  { id: 'pro', nombre: 'Pro', precio: 1799, color: '#C9A84C', mesas: '25 mesas', usuarios: '6 usuarios', limiteMesas: 25, limiteUsuarios: 6, popular: true, beneficios: ['Todo lo del Básico', 'Reportes avanzados', 'Dashboard completo', 'Soporte prioritario', 'Historial de pagos'] },
  { id: 'premium', nombre: 'Premium', precio: 2499, color: '#64B5F6', mesas: 'Ilimitadas', usuarios: 'Ilimitados', limiteMesas: null, limiteUsuarios: null, beneficios: ['Todo lo del Pro', 'Mesas ilimitadas', 'Usuarios ilimitados', 'Reportes personalizados', 'Soporte dedicado 24/7'] },
]

const PASOS = [
  { num: '01', titulo: 'Tu restaurante se registra', desc: 'En menos de 24 horas tu sistema está activo con el menú, mesas y usuarios configurados.' },
  { num: '02', titulo: 'El mesero habilita la mesa', desc: 'Desde su celular, el mesero activa la mesa y genera un código QR único para los comensales.' },
  { num: '03', titulo: 'El cliente ordena desde su mesa', desc: 'Escanea el QR, ve el menú con fotos y hace su pedido sin esperar al mesero.' },
  { num: '04', titulo: 'Cocina recibe en tiempo real', desc: 'La orden aparece instantáneamente en la pantalla de cocina con temporizador.' },
  { num: '05', titulo: 'El mesero entrega y cobra', desc: 'Recibe alerta cuando la orden está lista y genera la cuenta con un toque.' },
]

function generarSlug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000)
}

function generarPassword() {
  return Math.random().toString(36).slice(-8)
}

function ModalRegistro({ plan, onClose }) {
  const [form, setForm] = useState({
    nombreRestaurante: '',
    nombreDueno: '',
    email: '',
    telefono: '',
    rfc: '',
    mesas: plan.limiteMesas || 10,
  })
  const [enviando, setEnviando] = useState(false)
  const [credenciales, setCredenciales] = useState(null)
  const [error, setError] = useState('')

  function actualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function enviar() {
    if (!form.nombreRestaurante || !form.nombreDueno || !form.email || !form.telefono) {
      setError('Por favor completa todos los campos obligatorios')
      return
    }
    setError('')
    setEnviando(true)

    try {
      const slug = generarSlug(form.nombreRestaurante)
      const password = generarPassword()
      const numMesas = plan.limiteMesas || Number(form.mesas) || 10

      const { data: rest, error: errRest } = await supabase
        .from('restaurantes')
        .insert({
          nombre: form.nombreRestaurante,
          slug,
          dueno: form.nombreDueno,
          email: form.email,
          telefono: form.telefono,
          rfc: form.rfc,
          plan: plan.id,
          activo: false,
        })
        .select().single()

      if (errRest) throw errRest

      const mesasArr = Array.from({ length: numMesas }, (_, i) => ({
        restaurante_id: rest.id,
        numero: i + 1,
        status: 'disponible',
      }))
      const { error: errMesas } = await supabase.from('mesas').insert(mesasArr)
      if (errMesas) throw errMesas

      const { error: errUser } = await supabase.from('usuarios').insert({
        email: form.email,
        password,
        nombre: form.nombreDueno,
        rol: 'dashboard',
        restaurante_id: rest.id,
        slug,
      })
      if (errUser) throw errUser

      const respMP = await fetch('https://hacienda-servidor-production.up.railway.app/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: plan.nombre,
          precio: plan.precio,
          restaurante_id: rest.id,
          slug
        })
      })
      const dataMP = await respMP.json()

      if (dataMP.init_point) {
        window.location.href = dataMP.init_point
      } else {
        throw new Error('No se pudo iniciar el pago')
      }
    } catch (e) {
      console.error(e)
      setError('Hubo un problema al crear tu restaurante. Intenta de nuevo.')
    }
    setEnviando(false)
  }

  if (credenciales) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: C.bg2, borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '440px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>¡Tu restaurante está listo!</div>
          <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px' }}>
            Guarda estos datos — solo se muestran una vez.
          </div>
          <div style={{ background: C.card, borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '10px', color: C.textSub, letterSpacing: '1.5px', marginBottom: '4px' }}>USUARIO</div>
            <div style={{ fontSize: '14px', color: C.text, fontWeight: '600', marginBottom: '12px' }}>{credenciales.email}</div>
            <div style={{ fontSize: '10px', color: C.textSub, letterSpacing: '1.5px', marginBottom: '4px' }}>CONTRASEÑA PROVISIONAL</div>
            <div style={{ fontSize: '14px', color: C.gold, fontWeight: '700', fontFamily: 'monospace' }}>{credenciales.password}</div>
          </div>
          <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '16px' }}>
            Te recomendamos cambiar tu contraseña al iniciar sesión.
          </div>
          <a href="/login" style={{ display: 'block', textAlign: 'center', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', borderRadius: '100px', padding: '14px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
            Ir al login →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: C.bg2, borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}` }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: C.text }}>Registro · Plan {plan.nombre}</div>
          <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.textSub }}>✕</button>
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '20px' }}>
          ${plan.precio.toLocaleString()}/mes — completa los datos de tu restaurante
        </div>

        {[
          { label: 'NOMBRE DEL RESTAURANTE', key: 'nombreRestaurante', placeholder: 'Ej: La Hacienda' },
          { label: 'NOMBRE DEL DUEÑO', key: 'nombreDueno', placeholder: 'Ej: Juan Pérez' },
          { label: 'EMAIL', key: 'email', placeholder: 'correo@ejemplo.com', type: 'email' },
          { label: 'TELÉFONO', key: 'telefono', placeholder: '33 1234 5678', type: 'tel' },
          { label: 'RFC (OPCIONAL)', key: 'rfc', placeholder: 'XAXX010101000' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>{f.label}</label>
            <input
              type={f.type || 'text'}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => actualizar(f.key, e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.text }}
            />
          </div>
        ))}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>NÚMERO DE MESAS</label>
          {plan.limiteMesas ? (
            <div style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '14px', background: C.card, color: C.textSub, boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{plan.limiteMesas} mesas</span>
              <span style={{ fontSize: '10px', background: '#1A1400', color: C.gold, padding: '3px 8px', borderRadius: '20px', border: `1px solid ${C.gold}40` }}>Incluido en plan {plan.nombre}</span>
            </div>
          ) : (
            <input
              type="number"
              min="1"
              placeholder="Ej: 30"
              value={form.mesas}
              onChange={e => actualizar('mesas', Number(e.target.value))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.text }}
            />
          )}
        </div>

        <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '12px' }}>
          {plan.limiteUsuarios
            ? `Tu plan incluye hasta ${plan.limiteUsuarios} usuarios (cocina, mesero, dashboard).`
            : 'Tu plan incluye usuarios ilimitados.'}
        </div>

        {error && (
          <div style={{ background: '#1A0808', border: '1px solid #C0392B40', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#E57373', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <button onClick={enviar} disabled={enviando}
          style={{ width: '100%', background: enviando ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: enviando ? C.textSub : '#0A0A0A', border: 'none', borderRadius: '100px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: enviando ? 'not-allowed' : 'pointer' }}>
          {enviando ? 'Creando tu restaurante...' : 'Crear mi restaurante →'}
        </button>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [planSeleccionado, setPlanSeleccionado] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, color: C.text, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent', borderBottom: scrolled ? '1px solid #2A2A2A' : 'none', backdropFilter: scrolled ? 'blur(12px)' : 'none', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={32} />
          <span style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>Moreno <span style={{ color: C.gold }}>Order</span></span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a href="#como-funciona" style={{ fontSize: '13px', color: C.textSub, textDecoration: 'none', padding: '6px 12px', display: 'none' }}>Cómo funciona</a>
          <a href="#precios" style={{ fontSize: '13px', color: C.textSub, textDecoration: 'none', padding: '6px 12px' }}>Precios</a>
          <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', fontSize: '13px', fontWeight: '700', padding: '8px 18px', borderRadius: '100px', textDecoration: 'none', letterSpacing: '0.3px' }}>
            Contactar
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Glow de fondo */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1100px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '32px' }}>

          <FadeIn>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1A1400', border: '1px solid #C9A84C30', borderRadius: '100px', padding: '6px 16px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green }} />
              <span style={{ fontSize: '12px', color: C.gold, fontWeight: '600', letterSpacing: '0.5px' }}>Sistema activo en menos de 24 horas</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: '700', color: C.text, lineHeight: '1.1', letterSpacing: '-2px', margin: '0' }}>
              Tu restaurante ordenando<br />
              <span style={{ color: C.gold }}>sin caos.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: C.textSub, maxWidth: '560px', lineHeight: '1.6', margin: '0' }}>
              Moreno Order es el sistema de órdenes digital que permite a tus clientes pedir desde su mesa escaneando un QR — sin esperas, sin errores, sin papel.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', fontSize: '15px', fontWeight: '700', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', letterSpacing: '0.3px' }}>
                Quiero una demo →
              </a>
              <a href="#como-funciona" style={{ background: 'transparent', color: C.textSub, fontSize: '15px', fontWeight: '600', padding: '14px 28px', borderRadius: '100px', textDecoration: 'none', border: '1px solid #2A2A2A' }}>
                Ver cómo funciona
              </a>
            </div>
          </FadeIn>

          {/* Mockups hero */}
          <FadeIn delay={0.4} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', paddingTop: '20px' }}>
            <div style={{ transform: 'rotate(-2deg)', filter: 'drop-shadow(0 20px 40px rgba(201,168,76,0.15))' }}>
              <MockupMenu />
            </div>
            <div style={{ transform: 'rotate(1.5deg)', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))' }}>
              <MockupCocina />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Stats */}
      <FadeIn>
        <section style={{ padding: '40px 24px', borderTop: '1px solid #1C1C1C', borderBottom: '1px solid #1C1C1C' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', textAlign: 'center' }}>
            {[
              { num: '< 24h', label: 'Para activar tu sistema' },
              { num: '100%', label: 'Digital, sin papel' },
              { num: '3 planes', label: 'Para todo tipo de restaurante' },
              { num: '24/7', label: 'Sistema siempre activo' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: C.gold, letterSpacing: '-1px', marginBottom: '6px' }}>{s.num}</div>
                <div style={{ fontSize: '13px', color: C.textSub }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Cómo funciona */}
      <section id="como-funciona" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <div style={{ fontSize: '12px', color: C.gold, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Cómo funciona</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '700', color: C.text, letterSpacing: '-1px', margin: '0' }}>
                De la mesa al plato,<br /><span style={{ color: C.gold }}>todo en automático.</span>
              </h2>
            </div>
          </FadeIn>

          <div style={{ position: 'relative' }}>
            {/* Línea vertical */}
            <div style={{ position: 'absolute', left: '28px', top: '20px', bottom: '20px', width: '1px', background: 'linear-gradient(180deg, #C9A84C, #2A2A2A)', opacity: 0.4 }} />

            {PASOS.map((paso, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '40px', alignItems: 'flex-start' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1A1400', border: '1px solid #C9A84C40', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: C.gold, fontFamily: 'monospace' }}>{paso.num}</span>
                  </div>
                  <div style={{ paddingTop: '12px' }}>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{paso.titulo}</div>
                    <div style={{ fontSize: '14px', color: C.textSub, lineHeight: '1.6' }}>{paso.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section style={{ padding: '60px 24px', background: '#0D0D0D' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '700', color: C.text, letterSpacing: '-1px', margin: '0' }}>
                Todo lo que necesita tu restaurante
              </h2>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { icon: '📱', titulo: 'Menú digital con fotos', desc: 'Sube fotos de tus platillos y los clientes las ven antes de ordenar.' },
              { icon: '⚡', titulo: 'Cocina en tiempo real', desc: 'Las órdenes llegan instantáneamente con temporizador de preparación.' },
              { icon: '🪑', titulo: 'Control de mesas', desc: 'El mesero habilita y libera mesas desde su celular con un toque.' },
              { icon: '📊', titulo: 'Dashboard de ventas', desc: 'Ve en tiempo real ventas del día, platillos más pedidos y más.' },
              { icon: '📱', titulo: 'QR por mesa', desc: 'Genera e imprime los códigos QR de cada mesa desde el sistema.' },
              { icon: '🔔', titulo: 'Alertas de sonido', desc: 'Cocina y mesero reciben alertas sonoras cuando llega una orden.' },
            ].map((b, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div style={{ background: C.card, borderRadius: '16px', padding: '20px', border: '1px solid #2A2A2A' }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{b.icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>{b.titulo}</div>
                  <div style={{ fontSize: '13px', color: C.textSub, lineHeight: '1.6' }}>{b.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <div style={{ fontSize: '12px', color: C.gold, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Precios</div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '700', color: C.text, letterSpacing: '-1px', margin: '0 0 12px' }}>
                Sin sorpresas. Sin contratos.
              </h2>
              <p style={{ fontSize: '16px', color: C.textSub, margin: '0' }}>Cancela cuando quieras. Cambia de plan cuando quieras.</p>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {PLANES.map((plan, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ background: C.card, borderRadius: '20px', padding: '28px', border: plan.popular ? '1px solid #C9A84C60' : '1px solid #2A2A2A', position: 'relative' }}>
                  {plan.popular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', fontSize: '10px', fontWeight: '800', padding: '4px 16px', borderRadius: '100px', whiteSpace: 'nowrap', letterSpacing: '1px' }}>
                      MÁS POPULAR
                    </div>
                  )}
                  <div style={{ fontSize: '16px', fontWeight: '700', color: plan.color, marginBottom: '8px' }}>{plan.nombre}</div>
                  <div style={{ fontSize: '36px', fontWeight: '800', color: C.text, letterSpacing: '-2px', marginBottom: '4px' }}>
                    ${plan.precio.toLocaleString()}
                    <span style={{ fontSize: '14px', color: C.textSub, fontWeight: '400', letterSpacing: '0' }}>/mes</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', marginTop: '8px' }}>
                    <span style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color: C.textSub }}>{plan.mesas}</span>
                    <span style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color: C.textSub }}>{plan.usuarios}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '16px', marginBottom: '20px' }}>
                    {plan.beneficios.map((b, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: plan.popular ? '#1A1400' : '#1C1C1C', border: `1px solid ${plan.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: plan.color }} />
                        </div>
                        <span style={{ fontSize: '13px', color: '#8A8A8A' }}>{b}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setPlanSeleccionado(plan)} style={{
  display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', cursor: 'pointer',
  background: plan.popular ? 'linear-gradient(135deg, #C9A84C, #E8C97A)' : 'transparent',
  color: plan.popular ? '#0A0A0A' : plan.color,
  border: plan.popular ? 'none' : `1px solid ${plan.color}40`,
  borderRadius: '100px', padding: '12px',
  fontSize: '13px', fontWeight: '700',
}}>
  Empezar con {plan.nombre}
</button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <FadeIn>
        <section style={{ padding: '80px 24px', background: '#0D0D0D', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>🚀</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '700', color: C.text, letterSpacing: '-1px', marginBottom: '12px' }}>
              ¿Listo para modernizar<br />tu restaurante?
            </h2>
            <p style={{ fontSize: '16px', color: C.textSub, marginBottom: '32px', lineHeight: '1.6' }}>
              Escríbenos por WhatsApp y te hacemos una demo en vivo sin compromiso. Tu sistema puede estar activo hoy mismo.
            </p>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C97A)', color: '#0A0A0A', fontSize: '16px', fontWeight: '700', padding: '16px 36px', borderRadius: '100px', textDecoration: 'none', display: 'inline-block', letterSpacing: '0.3px' }}>
              Escribir por WhatsApp →
            </a>
            <div style={{ marginTop: '16px', fontSize: '13px', color: C.textSub }}>
              Respuesta en menos de 1 hora · Sin contratos
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid #1C1C1C', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={24} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>Moreno Order</span>
        </div>
        <div style={{ fontSize: '12px', color: '#3A3A3C', letterSpacing: '0.5px' }}>
          © 2026 Moreno Technology · Guadalajara, México
        </div>
        <a href={WHATSAPP} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: C.gold, textDecoration: 'none', fontWeight: '600' }}>
          morenocorp@gmail.com
        </a>
      </footer>

    {planSeleccionado && (
        <ModalRegistro plan={planSeleccionado} onClose={() => setPlanSeleccionado(null)} />
      )}

    </div>
  )
}