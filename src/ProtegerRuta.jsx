import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function ProtegerRuta({ children, roles }) {
  const [verificado, setVerificado] = useState(false)
  const navigate = useNavigate()
  const { slug } = useParams()

  useEffect(() => {
    const raw = localStorage.getItem('orderia_user')
    if (!raw) { navigate('/login'); return }

    const usuario = JSON.parse(raw)

    const esSuperAdmin = usuario.rol === 'superadmin'
    const rolPermitido = roles.includes(usuario.rol)
    const mismoSlug = usuario.slug === slug

    if (esSuperAdmin || (rolPermitido && mismoSlug)) {
      setVerificado(true)
    } else {
      navigate('/login')
    }
  }, [slug])

  if (!verificado) return null
  return children
}