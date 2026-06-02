import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { io } from 'socket.io-client'
import { useParams } from 'react-router-dom'

const socket = io('https://hacienda-servidor-production.up.railway.app')
socket.on('connect', () => console.log('Dashboard conectado'))
socket.on('connect_error', (err) => console.log('Error:', err.message))

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

const ESTADO_CFG = {
  recibida:   { color: '#E57373', bg: '#1A0808', border: '#C0392B40', label: 'Recibida' },
  preparando: { color: '#C9A84C', bg: '#1A1400', border: '#C9A84C40', label: 'Preparando' },
  lista:      { color: '#4CAF50', bg: '#0D2318', border: '#2D6A4F40', label: 'Lista' },
  entregada:  { color: '#8A8A8A', bg: '#141414', border: '#2A2A2A',   label: 'Entregada' },
  pagada:     { color: '#4CAF50', bg: '#0D2318', border: '#2D6A4F40', label: 'Pagada' },
}

function BarChart({ data, color }) {
  const col = color || '#C9A84C'
  if (!data || data.length === 0) return (
    <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '12px', color: '#6B6B6B' }}>Sin datos aún</span>
    </div>
  )
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: '#6B6B6B', fontWeight: '600' }}>{d.value > 0 ? '$'+d.value : ''}</span>
          <div style={{
            width: '100%',
            height: Math.max((d.value / max) * 80, d.value > 0 ? 4 : 0) + 'px',
            background: i === data.length - 1
              ? 'linear-gradient(180deg, #E8C97A, #C9A84C)'
              : col + '50',
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.4s ease',
          }} />
          <span style={{ fontSize: '9px', color: '#6B6B6B' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ segments, size }) {
  const sz = size || 100
  if (!segments || segments.length === 0) return null
  const total = segments.reduce((a, b) => a + b.value, 0)
  if (total === 0) return null
  const r = 38, cx = 50, cy = 50
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={sz} height={sz} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2A2A2A" strokeWidth="14" />
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circumference
        const gap = circumference - dash
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth="14"
            strokeDasharray={dash + ' ' + gap}
            strokeDashoffset={-offset * circumference}
            strokeLinecap="round"
            transform={'rotate(-90 ' + cx + ' ' + cy + ')'}
          />
        )
        offset += pct
        return el
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#F5F5F5" fontSize="13" fontWeight="700">{total}</text>
    </svg>
  )
}

function ImageUploader({ value, onChange }) {
  const inputRef = useRef()
  const [preview, setPreview] = useState(value || null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = function(ev) { setPreview(ev.target.result) }
    reader.readAsDataURL(file)
    const ext = file.name.split('.').pop()
    const fileName = 'platillo_' + Date.now() + '.' + ext
    const { data, error } = await supabase.storage
      .from('platillos')
      .upload(fileName, file, { upsert: true, contentType: file.type })
    if (!error) {
      const pub = supabase.storage.from('platillos').getPublicUrl(fileName)
      onChange(pub.data.publicUrl)
    } else {
      alert('Error al subir imagen. Verifica que el bucket "platillos" existe en Supabase Storage y es público.')
      console.error(error.message)
    }
    setUploading(false)
  }

  return (
    <div
      onClick={() => inputRef.current && inputRef.current.click()}
      style={{
        width: '100%', height: '140px', background: '#141414',
        border: '2px dashed ' + (preview ? '#C9A84C' : '#2A2A2A'),
        borderRadius: '12px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
        position: 'relative', transition: 'border-color 0.2s',
      }}
    >
      {preview ? (
        <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ textAlign: 'center', padding: '16px' }}>
          {uploading ? (
            <div style={{ fontSize: '12px', color: '#C9A84C' }}>Subiendo imagen...</div>
          ) : (
            <>
              <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}>📷</div>
              <div style={{ fontSize: '12px', color: '#8A8A8A' }}>Toca para subir foto</div>
              <div style={{ fontSize: '10px', color: '#6B6B6B', marginTop: '4px' }}>JPG, PNG, WEBP</div>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  border: '1px solid #2A2A2A', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box', background: '#141414', color: '#F5F5F5',
}

export default function Dashboard() {
  const { slug } = useParams()
  const [ordenes, setOrdenes] = useState([])
  const [platillos, setPlatillos] = useState([])
  const [restaurante, setRestaurante] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [modalPlatillo, setModalPlatillo] = useState(false)
  const [editandoPlatillo, setEditandoPlatillo] = useState(null)
  const [formPlatillo, setFormPlatillo] = useState({
    nombre: '', descripcion: '', precio: '',
    categoria: 'Platos fuertes', emoji: '🍽️',
    activo: true, imagen_url: '',
  })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
    socket.on('orden_recibida', () => cargarDatos())
    socket.on('estado_actualizado', () => cargarDatos())
    return function() { socket.off('orden_recibida'); socket.off('estado_actualizado') }
  }, [])

  async function cargarDatos() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const { data: rest } = await supabase.from('restaurantes').select('id, nombre').eq('slug', slug).single()
    if (!rest) return
    setRestaurante(rest)
    const { data: ord } = await supabase.from('ordenes').select('*, orden_items(*)')
      .eq('restaurante_id', rest.id).gte('created_at', hoy.toISOString()).order('created_at', { ascending: false })
    const { data: plat } = await supabase.from('platillos').select('*').eq('restaurante_id', rest.id).order('categoria')
    setOrdenes(ord || [])
    setPlatillos(plat || [])
    setCargando(false)
  }

  async function togglePlatillo(id, activo) {
    await supabase.from('platillos').update({ activo: !activo }).eq('id', id)
    setPlatillos(prev => prev.map(p => p.id === id ? Object.assign({}, p, { activo: !activo }) : p))
  }

  function abrirNuevoPlatillo() {
    setEditandoPlatillo(null)
    setFormPlatillo({ nombre: '', descripcion: '', precio: '', categoria: 'Platos fuertes', emoji: '🍽️', activo: true, imagen_url: '' })
    setModalPlatillo(true)
  }

  function abrirEditarPlatillo(p) {
    setEditandoPlatillo(p)
    setFormPlatillo({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, categoria: p.categoria, emoji: p.emoji || '🍽️', activo: p.activo, imagen_url: p.imagen_url || '' })
    setModalPlatillo(true)
  }

  async function guardarPlatillo() {
    if (!formPlatillo.nombre || !formPlatillo.precio) return
    setGuardando(true)
    const payload = {
      nombre: formPlatillo.nombre,
      descripcion: formPlatillo.descripcion,
      precio: Number(formPlatillo.precio),
      categoria: formPlatillo.categoria,
      emoji: formPlatillo.emoji,
      activo: formPlatillo.activo,
      imagen_url: formPlatillo.imagen_url || null,
    }
    if (editandoPlatillo) {
      const { data } = await supabase.from('platillos').update(payload).eq('id', editandoPlatillo.id).select().single()
      setPlatillos(prev => prev.map(p => p.id === editandoPlatillo.id ? data : p))
    } else {
      const { data } = await supabase.from('platillos').insert(Object.assign({}, payload, { restaurante_id: restaurante.id })).select().single()
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

  const ventasHoy = ordenes.reduce(function(a, o) { return a + Number(o.total) }, 0)
  const ticketProm = ordenes.length > 0 ? Math.round(ventasHoy / ordenes.length) : 0
  const mesasMas = {}
  ordenes.forEach(function(o) { mesasMas[o.mesa] = (mesasMas[o.mesa] || 0) + Number(o.total) })
  const mesaTop = Object.entries(mesasMas).sort(function(a, b) { return b[1] - a[1] })[0]

  const popularidad = {}
  ordenes.forEach(function(o) {
    o.orden_items && o.orden_items.forEach(function(item) {
      popularidad[item.nombre] = (popularidad[item.nombre] || 0) + item.cantidad
    })
  })
  const topPlatillos = Object.entries(popularidad).sort(function(a, b) { return b[1] - a[1] }).slice(0, 5)

  const ahoraH = new Date().getHours()
  const ventasPorHora = Array.from({ length: 8 }, function(_, i) {
    const h = (ahoraH - 7 + i + 24) % 24
    const total = ordenes.filter(function(o) { return new Date(o.created_at).getHours() === h })
      .reduce(function(a, o) { return a + Number(o.total) }, 0)
    return { label: h + 'h', value: total }
  })

  const estadoCounts = { recibida: 0, preparando: 0, lista: 0, entregada: 0 }
  ordenes.forEach(function(o) { if (estadoCounts[o.estado] !== undefined) estadoCounts[o.estado]++ })
  const donutSegs = [
    { color: '#E57373', value: estadoCounts.recibida },
    { color: '#C9A84C', value: estadoCounts.preparando },
    { color: '#4CAF50', value: estadoCounts.lista },
    { color: '#8A8A8A', value: estadoCounts.entregada },
  ].filter(function(s) { return s.value > 0 })

  const categorias = [...new Set(platillos.map(function(p) { return p.categoria }))]

  if (cargando) return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
        <div style={{ fontSize: '14px', color: C.textSub }}>Cargando dashboard...</div>
      </div>
    </div>
  )

  const TABS = [['resumen', 'Resumen'], ['analisis', 'Análisis'], ['menu', 'Menú'], ['ordenes', 'Órdenes']]

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: C.bg, minHeight: '100vh' }}>

      <div style={{ background: C.bg2, borderBottom: '1px solid ' + C.border, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: C.card, borderRadius: '10px', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: C.text }}>Dashboard</div>
            <div style={{ fontSize: '11px', color: C.gold, letterSpacing: '1px' }}>{restaurante && restaurante.nombre && restaurante.nombre.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0D2318', border: '1px solid #2D6A4F40', borderRadius: '20px', padding: '6px 14px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: '11px', color: C.green, fontWeight: '700' }}>En vivo</span>
        </div>
      </div>

      <div style={{ background: C.bg2, display: 'flex', borderBottom: '1px solid ' + C.border }}>
        {TABS.map(function(t) {
          const id = t[0], label = t[1]
          return (
            <button key={id} onClick={function() { setTab(id) }} style={{
              flex: 1, padding: '13px 4px', fontSize: '12px', fontWeight: '600',
              color: tab === id ? C.gold : C.textSub,
              background: 'transparent', border: 'none',
              borderBottom: tab === id ? '2px solid ' + C.gold : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{label}</button>
          )
        })}
      </div>

      <div style={{ padding: '16px' }}>

        {tab === 'resumen' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Ventas hoy', value: '$' + ventasHoy.toLocaleString(), color: C.gold, icon: '💰' },
                { label: 'Órdenes', value: ordenes.length, color: C.text, icon: '📋' },
                { label: 'Ticket promedio', value: '$' + ticketProm, color: C.gold, icon: '🎯' },
                { label: 'Mesa top', value: mesaTop ? 'Mesa ' + mesaTop[0] : '—', color: C.text, icon: '🏆' },
              ].map(function(item) {
                return (
                  <div key={item.label} style={{ background: C.card, borderRadius: '14px', padding: '16px', border: '1px solid ' + C.border }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: C.textSub }}>{item.label}</div>
                      <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: item.color, letterSpacing: '-0.5px' }}>{item.value}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>Ventas por hora</div>
                  <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px' }}>Últimas 8 horas</div>
                </div>
                <div style={{ background: C.gold + '20', borderRadius: '8px', padding: '4px 10px' }}>
                  <span style={{ fontSize: '11px', color: C.gold, fontWeight: '700' }}>HOY</span>
                </div>
              </div>
              <BarChart data={ventasPorHora} color={C.gold} />
            </div>

            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '14px' }}>Más pedidos hoy</div>
              {topPlatillos.length === 0 && <div style={{ fontSize: '12px', color: C.textSub, textAlign: 'center', padding: '16px 0' }}>Sin órdenes aún</div>}
              {topPlatillos.map(function(entry, i) {
                const nombre = entry[0], qty = entry[1]
                return (
                  <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < topPlatillos.length - 1 ? '1px solid ' + C.border : 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: i === 0 ? C.gold : C.textSub, width: '20px' }}>{i === 0 ? '🥇' : i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: C.text }}>{nombre}</span>
                    <div style={{ width: Math.max((qty / topPlatillos[0][1]) * 80, 4) + 'px', height: '4px', background: 'linear-gradient(90deg, ' + C.gold + ', ' + C.goldLight + ')', borderRadius: '2px' }} />
                    <span style={{ fontSize: '12px', color: C.gold, fontWeight: '700', width: '24px', textAlign: 'right' }}>{qty}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'analisis' && (
          <div>
            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '14px' }}>Estado de órdenes</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <DonutChart segments={donutSegs} size={110} />
                <div style={{ flex: 1 }}>
                  {[
                    { label: 'Recibidas', color: '#E57373', count: estadoCounts.recibida },
                    { label: 'Preparando', color: C.gold, count: estadoCounts.preparando },
                    { label: 'Listas', color: C.green, count: estadoCounts.lista },
                    { label: 'Entregadas', color: C.silver, count: estadoCounts.entregada },
                  ].map(function(s) {
                    return (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '12px', color: C.silver }}>{s.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: C.text }}>{s.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '14px' }}>Ingresos por categoría</div>
              {(function() {
                const catIngresos = {}
                ordenes.forEach(function(o) {
                  o.orden_items && o.orden_items.forEach(function(item) {
                    const cat = item.categoria || 'Sin categoría'
                    catIngresos[cat] = (catIngresos[cat] || 0) + (item.precio * item.cantidad)
                  })
                })
                const entries = Object.entries(catIngresos).sort(function(a, b) { return b[1] - a[1] })
                const maxVal = entries.length > 0 ? entries[0][1] : 1
                if (entries.length === 0) return <div style={{ fontSize: '12px', color: C.textSub, textAlign: 'center', padding: '16px 0' }}>Sin datos aún</div>
                return entries.map(function(e) {
                  const cat = e[0], total = e[1]
                  return (
                    <div key={cat} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: C.silver }}>{cat}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: C.gold }}>${total.toLocaleString()}</span>
                      </div>
                      <div style={{ height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: ((total / maxVal) * 100) + '%', background: 'linear-gradient(90deg, ' + C.gold + ', ' + C.goldLight + ')', borderRadius: '3px' }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: '1px solid ' + C.border }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '14px' }}>Actividad por mesa</div>
              {Object.entries(mesasMas).sort(function(a, b) { return b[1] - a[1] }).slice(0, 8).length === 0
                ? <div style={{ fontSize: '12px', color: C.textSub, textAlign: 'center', padding: '16px 0' }}>Sin datos aún</div>
                : Object.entries(mesasMas).sort(function(a, b) { return b[1] - a[1] }).slice(0, 8).map(function(entry) {
                  const mesa = entry[0], total = entry[1]
                  return (
                    <div key={mesa} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid ' + C.border }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', background: C.bg2, borderRadius: '8px', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: C.gold }}>{mesa}</div>
                        <span style={{ fontSize: '12px', color: C.silver }}>Mesa {mesa}</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: C.text }}>${total.toLocaleString()}</span>
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}

        {tab === 'menu' && (
          <div>
            <button
              onClick={abrirNuevoPlatillo}
              style={{ width: '100%', background: 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: '#0A0A0A', border: 'none', borderRadius: '100px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px', letterSpacing: '0.5px' }}
            >
              + Agregar platillo
            </button>

            {categorias.map(function(cat) {
              return (
                <div key={cat} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ height: '1px', width: '14px', background: C.gold }} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', textTransform: 'uppercase' }}>{cat}</span>
                  </div>
                  {platillos.filter(function(p) { return p.categoria === cat }).map(function(p) {
                    return (
                      <div key={p.id} style={{ background: C.card, borderRadius: '14px', padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid ' + C.border }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: C.bg2, border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, overflow: 'hidden' }}>
                          {p.imagen_url
                            ? <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : p.emoji
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: p.activo ? C.text : C.textSub, textDecoration: p.activo ? 'none' : 'line-through' }}>{p.nombre}</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: C.gold, marginTop: '2px' }}>${p.precio}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={function() { togglePlatillo(p.id, p.activo) }} style={{ padding: '5px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: p.activo ? '#0D2318' : C.bg2, color: p.activo ? C.green : C.textSub }}>
                            {p.activo ? 'Activo' : 'Pausado'}
                          </button>
                          <button onClick={function() { abrirEditarPlatillo(p) }} style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid ' + C.gold + '40', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: C.gold + '15', color: C.gold }}>
                            Editar
                          </button>
                          <button onClick={function() { eliminarPlatillo(p.id) }} style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid #C0392B40', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: '#1A0808', color: '#E57373' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'ordenes' && (
          <div style={{ background: C.card, borderRadius: '14px', padding: '16px', border: '1px solid ' + C.border }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: C.textSub, letterSpacing: '2px', marginBottom: '14px' }}>ÓRDENES DE HOY</div>
            {ordenes.length === 0 && <div style={{ fontSize: '13px', color: C.textSub, textAlign: 'center', padding: '20px 0' }}>Sin órdenes hoy</div>}
            {ordenes.map(function(o, i) {
              const ec = ESTADO_CFG[o.estado] || ESTADO_CFG.recibida
              return (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < ordenes.length - 1 ? '1px solid ' + C.border : 'none' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: C.text }}>Mesa {o.mesa}</span>
                    <span style={{ fontSize: '11px', color: C.textSub, marginLeft: '8px' }}>#{o.id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: ec.bg, color: ec.color, fontWeight: '600', border: '1px solid ' + ec.border }}>{ec.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: C.gold }}>${o.total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {modalPlatillo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: C.bg2, borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid ' + C.border, borderBottom: 'none' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>
                {editandoPlatillo ? 'Editar platillo' : 'Nuevo platillo'}
              </div>
              <button onClick={function() { setModalPlatillo(false) }} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '14px', color: C.silver }}>✕</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>FOTO DEL PLATILLO</label>
              <ImageUploader
                value={formPlatillo.imagen_url}
                onChange={function(url) { setFormPlatillo(function(prev) { return Object.assign({}, prev, { imagen_url: url }) }) }}
              />
            </div>

            {[
              { key: 'nombre', label: 'NOMBRE', placeholder: 'Ej: Pozole rojo', type: 'text' },
              { key: 'descripcion', label: 'DESCRIPCIÓN', placeholder: 'Ej: Con hominy, lechuga y rábano', type: 'text' },
              { key: 'precio', label: 'PRECIO (MXN)', placeholder: 'Ej: 175', type: 'number' },
              { key: 'categoria', label: 'CATEGORÍA', placeholder: 'Ej: Entradas, Platos fuertes, Bebidas', type: 'text' },
            ].map(function(field) {
              return (
                <div key={field.key} style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: C.textSub, display: 'block', marginBottom: '6px', letterSpacing: '1.5px' }}>{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formPlatillo[field.key]}
                    onChange={function(e) {
                      const val = e.target.value
                      setFormPlatillo(function(prev) {
                        const next = Object.assign({}, prev)
                        next[field.key] = val
                        return next
                      })
                    }}
                    style={inputStyle}
                  />
                </div>
              )
            })}

            <button
              onClick={guardarPlatillo}
              disabled={guardando}
              style={{ width: '100%', background: guardando ? C.border : 'linear-gradient(135deg, ' + C.gold + ', ' + C.goldLight + ')', color: guardando ? C.textSub : '#0A0A0A', border: 'none', borderRadius: '100px', padding: '15px', fontSize: '15px', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer', marginTop: '8px', letterSpacing: '0.5px' }}
            >
              {guardando ? 'Guardando...' : editandoPlatillo ? 'Guardar cambios' : 'Agregar platillo'}
            </button>

          </div>
        </div>
      )}

    </div>
  )
}