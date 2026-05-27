import { useState } from 'react'

export default function Chatbot({ platillos, onAgregar }) {
  const [mensajes, setMensajes] = useState([
    { rol: 'bot', texto: '¡Hola! Soy tu asistente. ¿Qué se te antoja hoy? Puedo recomendarte algo según tus gustos.' }
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar() {
    if (!input.trim()) return
    const texto = input.trim()
    setInput('')
    setMensajes(prev => [...prev, { rol: 'user', texto }])
    setCargando(true)

    try {
      const res = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, menu: platillos })
      })
      const data = await res.json()
      setMensajes(prev => [...prev, { rol: 'bot', texto: data.respuesta }])
    } catch (e) {
      setMensajes(prev => [...prev, { rol: 'bot', texto: 'Hubo un error, intenta de nuevo.' }])
    }
    setCargando(false)
  }

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0C447C', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        🤖 Asistente IA
      </div>

      <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mensajes.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.rol === 'user' ? 'flex-end' : 'flex-start',
            background: m.rol === 'user' ? '#185FA5' : '#f0f0f0',
            color: m.rol === 'user' ? 'white' : '#333',
            padding: '8px 12px', borderRadius: '10px',
            fontSize: '13px', maxWidth: '85%', lineHeight: '1.4'
          }}>
            {m.texto}
          </div>
        ))}
        {cargando && (
          <div style={{ alignSelf: 'flex-start', background: '#f0f0f0', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', color: '#888' }}>
            Escribiendo...
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar()}
          placeholder="¿Algo sin carne? ¿Qué recomiendas?"
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
        />
        <button onClick={enviar} style={{ background: '#185FA5', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}>
          Enviar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
        {['¿Qué recomiendas?', 'Algo sin carne', 'Lo más popular'].map(q => (
          <button key={q} onClick={() => { setInput(q); }} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', border: '1px solid #ddd', background: 'transparent', cursor: 'pointer', color: '#555' }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}