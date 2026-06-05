import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'
import { QRCodeSVG as QRCode } from 'qrcode.react'

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
  red: '#E57373',
}

export default function Dashboard() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])
  const [platillos, setPlatillos] = useState([])
  const [restaurante, setRestaurante] = useState(null)
  const [mesas, setMesas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [modalPlatillo, setModalPlatillo] = useState(false)
  const [editandoPlatillo, setEditandoPlatillo] = useState(null)
  const [formPlatillo, setFormPlatillo] = useState({ nombre: '', descripcion: '', precio: '', categoria: 'Platos fuertes', imagen: '', activo: true })
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
    socket.on('orden_recibida', () => cargarDatos())
    socket.on('estado_actualizado', () => cargarDatos())
    return () => {
      socket.off('orden_recibida')
      socket.off('estado_actualizado')
    }
  }, [])

  async function cargarDatos() {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const { data: rest } = await supabase
      .from('restaurantes').select('id, nombre').eq('slug', slug).single()
    if (!rest) return
    setRestaurante(rest)

    const { data: ordenesData } = await supabase
      .from('ordenes').select('*, orden_items(*)')
      .eq('restaurante_id', rest.id)
      .gte('created_at', hoy.toISOString())
      .order('created_at', { ascending: false })

    const { data: platillosData } = await supabase
      .from('platillos').select('*')
      .eq('restaurante_id', rest.id).order('categoria')

    const { data: mesasData } = await supabase
      .from('mesas').select('*')
      .eq('restaurante_id', rest.id).order('numero')

    setOrdenes(ordenesData || [])
    setPlatillos(platillosData || [])
    setMesas(mesasData || [])
    setCargando(false)
  }

  async function togglePlatillo(id, activo) {
    await supabase.from('platillos').update({ activo: !activo }).eq('id', id)
    setPlatillos(prev => prev.map(p => p.id === id ? { ...p, activo: !activo } : p))
  }

  function abrirNuevoPlatillo() {
    setEditandoPlatillo(null)
    setFormPlatillo({ nombre: '', descripcion: '', precio: '', categoria: 'Platos fuertes', imagen: '', activo: true })
    setModalPlatillo(true)
  }

  function abrirEditarPlatillo(p) {
    setEditandoPlatillo(p)
    setFormPlatillo({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, categoria: p.categoria, imagen: p.imagen || '', activo: p.activo })
    setModalPlatillo(true)
  }

  async function subirFoto(file) {
    if (!file) return
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const nombre = `${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('platillos')
      .upload(nombre, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('platillos')
        .getPublicUrl(nombre)
      setFormPlatillo(prev => ({ ...prev, imagen: urlData.publicUrl }))
    }
    setSubiendoFoto(false)
  }

  async function guardarPlatillo() {
    if (!formPlatillo.nombre || !formPlatillo.precio) return
    setGuardando(true)
    if (editandoPlatillo) {
      const { data } = await supabase.from('platillos')
        .update({ nombre: formPlatillo.nombre, descripcion: formPlatillo.descripcion, precio: Number(formPlatillo.precio), categoria: formPlatillo.categoria, imagen: formPlatillo.imagen, activo: formPlatillo.activo })
        .eq('id', editandoPlatillo.id).select().single()
      setPlatillos(prev => prev.map(p => p.id === editandoPlatillo.id ? data : p))
    } else {
      const { data } = await supabase.from('platillos')
        .insert({ nombre: formPlatillo.nombre, descripcion: formPlatillo.descripcion, precio: Number(formPlatillo.precio), categoria: formPlatillo.categoria, imagen: formPlatillo.imagen, activo: formPlatillo.activo, restaurante_id: restaurante.id })
        .select().single()
      setPlatillos(prev => [...prev, data])
    }
    setModalPlatillo(false)
    setGuardando(false)
  }

  async function eliminarPlatillo(id) {
    if (!confirm('¿Eliminar este platillo?')) return
    await supabase.from('platillos').delete().eq('id', id)
    setPlatillos(prev => prev.filter(p => p.id !== id))
  }

  function imprimirQR(mesa) {
    const url = `${window.location.origin}/r/${slug}/mesa/${mesa.numero}`
    const ventana = window.open('', '_blank', 'width=400,height=500')
    ventana.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Mesa ${mesa.numero}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
        .container { text-align: center; padding: 32px; border: 2px solid #C9A84C; border-radius: 16px; max-width: 280px; }
        h2 { color: #0A0A0A; font-size: 20px; margin: 0 0 4px; }
        p { color: #6B6B6B; font-size: 13px; margin: 0 0 16px; }
        img { width: 200px; height: 200px; }
        .mesa { font-size: 28px; font-weight: 700; color: #C9A84C; margin-top: 16px; }
        .footer { font-size: 10px; color: #aaa; margin-top: 16px; letter-spacing: 1px; }
      </style></head><body>
      <div class="container">
        <h2>${restaurante?.nombre}</h2>
        <p>Escanea para ordenar</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />
        <div class="mesa">Mesa ${mesa.numero}</div>
        <div class="footer">ORDER MORENO · MORENO TECHNOLOGY</div>
      </div>
      <script>setTimeout(() => window.print(), 500)</script>
      </body></html>
    `)
    ventana.document.close()
  }

  function imprimirTodos() {
    const qrsHtml = mesas.map(mesa => {
      const url = `${window.location.origin}/r/${slug}/mesa/${mesa.numero}`
      return `
        <div class="qr-card">
          <h2>${restaurante?.nombre}</h2>
          <p>Escanea para ordenar</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" />
          <div class="mesa">Mesa ${mesa.numero}</div>
          <div class="footer">ORDER MORENO · MORENO TECHNOLOGY</div>
        </div>
      `
    }).join('')
    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>QRs · ${restaurante?.nombre}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 16px; background: #fff; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .qr-card { text-align: center; padding: 20px; border: 2px solid #C9A84C; border-radius: 12px; }
        h2 { color: #0A0A0A; font-size: 14px; margin: 0 0 2px; }
        p { color: #6B6B6B; font-size: 11px; margin: 0 0 10px; }
        img { width: 150px; height: 150px; }
        .mesa { font-size: 22px; font-weight: 700; color: #C9A84C; margin-top: 8px; }
        .footer { font-size: 9px; color: #aaa; margin-top: 8px; letter-spacing: 1px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="grid">${qrsHtml}</div>
      <script>setTimeout(() => window.print(), 800)</script>
      </body></html>
    `)
    ventana.document.close()
  }

  const ventasHoy = ordenes.reduce((acc, o) => acc + Number(o.total), 0)
  const popularidad = {}
  ordenes.forEach(o => {
    o.orden_items?.forEach(item => {
      popularidad[item.nombre] = (popularidad[item.nombre] || 0) + item.cantidad
    })
  })
  const topPlatillos = Object.entries(popularidad).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const categorias = [...new Set(platillos.map(p => p.categoria))]

  if (cargando) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontSize: '14px', color: C.textSub }}>Cargando...</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }}>

      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📊</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>{restaurante?.nombre}</div>
            <div style={{ fontSize: '11px', color: C.gold, letterSpacing: '1px' }}>DASHBOARD</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0D2318', border: '1px solid #2D6A4F40', borderRadius: '20px', padding: '5px 12px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.successLight }} />
          <span style={{ fontSize: '11px', color: C.successLight, fontWeight: '600', letterSpacing: '1px' }}>EN VIVO</span>
        </div>
      </div>

      <div style={{ background: C.bg2, display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {[['resumen', '📊'], ['menu', '🍽️'], ['ordenes', '📋'], ['qrs', '📱']].map(([id, icon]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: '13px 8px', fontSize: '11px', fontWeight: '600', color: tab === id ? C.gold : C.textSub, background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${C.gold}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '60px' }}>
            {icon} {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px' }}>

        {tab === 'resumen' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', color: C.textSub, letterSpacing: '1px', marginBottom: '6px' }}>VENTAS HOY</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: C.gold }}>${ventasHoy.toLocaleString()}</div>
              </div>
              <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', color: C.textSub, letterSpacing: '1px', marginBottom: '6px' }}>ÓRDENES HOY</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: C.text }}>{ordenes.length}</div>
              </div>
            </div>
            <div style={{ background: C.card, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: C.text, letterSpacing: '1px' }}>MÁS PEDIDOS HOY</span>
              </div>
              {topPlatillos.length === 0 && <div style={{ fontSize: '13px', color: C.textSub, textAlign: 'center', padding: '20px' }}>Sin órdenes hoy todavía</div>}
              {topPlatillos.map(([nombre, qty], i) => (
                <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '12px', color: i === 0 ? C.gold : C.textSub, fontWeight: '700', width: '16px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '13px', color: C.text }}>{nombre}</span>
                  <div style={{ width: `${(qty / topPlatillos[0][1]) * 50}px`, height: '4px', background: i === 0 ? C.gold : C.border, borderRadius: '2px' }} />
                  <span style={{ fontSize: '12px', color: C.textSub, width: '20px', textAlign: 'right' }}>{qty}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'menu' && (
          <>
            <button onClick={abrirNuevoPlatillo}
              style={{ width: '100%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' }}>
              + Agregar platillo
            </button>
            {categorias.map(cat => (
              <div key={cat} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
                  <span style={{ fontSize: '10px', fontWeight: '700', color: C.gold, letterSpacing: '2px', textTransform: 'uppercase' }}>{cat}</span>
                </div>
                {platillos.filter(p => p.categoria === cat).map(p => (
                  <div key={p.id} style={{ background: C.card, borderRadius: '14px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${C.border}` }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#1A1400', overflow: 'hidden', flexShrink: 0 }}>
                      {p.imagen
                        ? <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🍽️</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: p.activo ? C.text : C.textSub, textDecoration: p.activo ? 'none' : 'line-through' }}>{p.nombre}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: C.gold }}>${p.precio}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      <button onClick={() => togglePlatillo(p.id, p.activo)}
                        style={{ padding: '4px 8px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: p.activo ? '#0D2318' : C.bg2, color: p.activo ? C.successLight : C.textSub, border: `1px solid ${p.activo ? '#2D6A4F40' : C.border}` }}>
                        {p.activo ? 'Activo' : 'Pausado'}
                      </button>
                      <button onClick={() => abrirEditarPlatillo(p)}
                        style={{ padding: '4px 8px', borderRadius: '20px', border: `1px solid ${C.gold}40`, cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: '#1A1400', color: C.gold }}>
                        Editar
                      </button>
                      <button onClick={() => eliminarPlatillo(p.id)}
                        style={{ padding: '4px 8px', borderRadius: '20px', border: '1px solid #C0392B40', cursor: 'pointer', fontSize: '10px', fontWeight: '700', background: '#1A0808', color: C.red }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {tab === 'ordenes' && (
          <div style={{ background: C.card, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: C.text, letterSpacing: '1px' }}>ÓRDENES DE HOY</span>
            </div>
            {ordenes.length === 0 && <div style={{ fontSize: '13px', color: C.textSub, textAlign: 'center', padding: '20px' }}>Sin órdenes hoy</div>}
            {ordenes.map(o => (
              <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Mesa {o.mesa}</span>
                  <span style={{ fontSize: '11px', color: C.textSub, marginLeft: '8px' }}>#{o.id}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontWeight: '700',
                    background: o.estado === 'pagada' || o.estado === 'lista' ? '#0D2318' : o.estado === 'preparando' ? '#1A1400' : '#0A1520',
                    color: o.estado === 'pagada' || o.estado === 'lista' ? C.successLight : o.estado === 'preparando' ? C.gold : C.silver,
                    border: `1px solid ${o.estado === 'pagada' || o.estado === 'lista' ? '#2D6A4F40' : o.estado === 'preparando' ? C.gold + '40' : C.border}`
                  }}>
                    {o.estado}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: C.gold }}>${o.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'qrs' && (
          <>
            <div style={{ background: C.card, borderRadius: '16px', padding: '14px 16px', marginBottom: '16px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '3px', height: '14px', background: C.gold, borderRadius: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: C.text, letterSpacing: '1px' }}>CÓDIGOS QR · MESAS</span>
              </div>
              <div style={{ fontSize: '12px', color: C.textSub }}>Imprime o muestra cada QR en su mesa correspondiente</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {mesas.map(mesa => {
                const url = `${window.location.origin}/r/${slug}/mesa/${mesa.numero}`
                return (
                  <div key={mesa.id} style={{ background: C.card, borderRadius: '16px', padding: '14px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '10px' }}>Mesa {mesa.numero}</div>
                    <div style={{ background: '#fff', borderRadius: '10px', padding: '8px', display: 'inline-block', marginBottom: '10px' }}>
                      <QRCode value={url} size={90} level="H" includeMargin={false} />
                    </div>
                    <div style={{ fontSize: '9px', color: C.textSub, marginBottom: '10px' }}>mesa/{mesa.numero}</div>
                    <button onClick={() => imprimirQR(mesa)}
                      style={{ width: '100%', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: '#0A0A0A', border: 'none', borderRadius: '8px', padding: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                      🖨️ Imprimir
                    </button>
                  </div>
                )
              })}
            </div>
            <button onClick={imprimirTodos}
              style={{ width: '100%', background: C.card, color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              🖨️ Imprimir todos los QRs
            </button>
          </>
        )}

      </div>

      {modalPlatillo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.bg2, borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>
                {editandoPlatillo ? '✏️ Editar platillo' : '+ Nuevo platillo'}
              </div>
              <button onClick={() => setModalPlatillo(false)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>

            {/* Foto */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>FOTO DEL PLATILLO</label>
              {formPlatillo.imagen && (
                <div style={{ marginBottom: '10px', borderRadius: '12px', overflow: 'hidden', height: '140px', position: 'relative' }}>
                  <img src={formPlatillo.imagen} alt="platillo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setFormPlatillo(prev => ({ ...prev, imagen: '' }))}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>
                    ✕
                  </button>
                </div>
              )}
              <label style={{ display: 'block', background: C.bg, border: `1px dashed ${subiendoFoto ? C.gold : C.border}`, borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                <input type="file" accept="image/*" onChange={e => subirFoto(e.target.files[0])} style={{ display: 'none' }} />
                {subiendoFoto ? (
                  <div style={{ fontSize: '13px', color: C.gold }}>Subiendo foto...</div>
                ) : (
                  <>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>📷</div>
                    <div style={{ fontSize: '12px', color: C.textSub }}>Toca para subir foto</div>
                    <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>JPG, PNG — máx 5MB</div>
                  </>
                )}
              </label>
            </div>

            {[
              { label: 'NOMBRE', key: 'nombre', placeholder: 'Ej: Pozole rojo' },
              { label: 'DESCRIPCIÓN', key: 'descripcion', placeholder: 'Ej: Con hominy, lechuga y rábano' },
              { label: 'PRECIO (MXN)', key: 'precio', placeholder: 'Ej: 175', type: 'number' },
              { label: 'CATEGORÍA', key: 'categoria', placeholder: 'Ej: Entradas, Platos fuertes, Bebidas' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>{field.label}</label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formPlatillo[field.key]}
                  onChange={e => setFormPlatillo(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: C.bg, color: C.text }}
                />
              </div>
            ))}

            <button onClick={guardarPlatillo} disabled={guardando}
              style={{ width: '100%', background: guardando ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: guardando ? C.textSub : '#0A0A0A', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {guardando ? 'Guardando...' : editandoPlatillo ? 'Guardar cambios' : 'Agregar platillo'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}