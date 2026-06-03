import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabase'

const C = {
  bg: '#0A0A0A',
  bg2: '#141414',
  card: '#1C1C1C',
  border: '#2A2A2A',
  gold: '#C9A84C',
  text: '#F5F5F5',
  textSub: '#6B6B6B',
  red: '#E57373',
}

export default function ProtegerRuta({ children, roles }) {
  const [verificado, setVerificado] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [restaurante, setRestaurante] = useState(null)
  const navigate = useNavigate()
  const { slug } = useParams()

  useEffect(() => {
    async function verificar() {
      const raw = sessionStorage.getItem('orderia_user')
      if (!raw) { navigate('/login'); return }

      const usuario = JSON.parse(raw)
      const esSuperAdmin = usuario.rol === 'superadmin'
      const rolPermitido = roles.includes(usuario.rol)
      const mismoSlug = usuario.slug === slug

      if (!esSuperAdmin && !(rolPermitido && mismoSlug)) {
        navigate('/login')
        return
      }

      const { data: rest } = await supabase
        .from('restaurantes')
        .select('id, nombre, activo')
        .eq('slug', slug)
        .single()

      if (!rest) { navigate('/login'); return }

      setRestaurante(rest)

      if (!rest.activo && !esSuperAdmin) {
        setBloqueado(true)
        return
      }

      setVerificado(true)
    }

    verificar()
  }, [slug])

  if (bloqueado) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>

        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(224,57,57,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', width: '72px', height: '72px', background: '#1A0808', border: '1px solid #C0392B40', borderRadius: '20px', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '24px' }}>
          🔒
        </div>

        <div style={{ fontSize: '22px', fontWeight: '700', color: C.text, marginBottom: '8px' }}>
          Servicio suspendido
        </div>
        <div style={{ fontSize: '14px', color: C.textSub, marginBottom: '24px', lineHeight: '1.6' }}>
          El acceso a <span style={{ color: C.gold, fontWeight: '600' }}>{restaurante?.nombre}</span> ha sido suspendido temporalmente.
        </div>

        <div style={{ background: '#1A0808', border: '1px solid #C0392B40', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: C.red, fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>
            ¿QUÉ PASÓ?
          </div>
          <div style={{ fontSize: '13px', color: '#EF9A9A', lineHeight: '1.6' }}>
            Es posible que haya un pago pendiente o que el servicio haya sido pausado por el administrador. Contacta a Moreno Technology para más información.
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: '1px solid ' + C.border }}>
          <div style={{ fontSize: '11px', color: C.textSub, marginBottom: '6px', letterSpacing: '1px' }}>SOPORTE</div>
          <div style={{ fontSize: '14px', color: C.gold, fontWeight: '600' }}>Moreno Technology</div>
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px' }}>Contacta a tu administrador del sistema</div>
        </div>

        <div style={{ marginTop: '24px', fontSize: '10px', color: '#2A2A2A', letterSpacing: '1px' }}>
          MORENO TECHNOLOGY © 2026
        </div>

      </div>
    </div>
  )

  if (!verificado) return null
  return children
}