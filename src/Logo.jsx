export default function Logo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#1C1C1C"/>
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" stroke="#C9A84C" strokeOpacity="0.4"/>
      
      {/* Plato */}
      <ellipse cx="32" cy="36" rx="16" ry="4" fill="#C9A84C" fillOpacity="0.15"/>
      <ellipse cx="32" cy="35" rx="14" ry="3" fill="none" stroke="#C9A84C" strokeWidth="1.2"/>
      
      {/* Cúpula */}
      <path d="M18 35 Q18 22 32 22 Q46 22 46 35" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
      
      {/* Brillo cúpula */}
      <path d="M22 32 Q22 25 32 25" fill="none" stroke="#E8C97A" strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round"/>
      
      {/* Tenedor */}
      <line x1="24" y1="16" x2="24" y2="28" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="22" y1="16" x2="22" y2="20" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/>
      <line x1="24" y1="16" x2="24" y2="20" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/>
      <line x1="26" y1="16" x2="26" y2="20" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round"/>
      
      {/* Cuchillo */}
      <line x1="40" y1="16" x2="40" y2="28" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M40 16 Q43 18 43 22 L40 22" fill="#C9A84C" fillOpacity="0.6"/>
      
      {/* Punto dorado top */}
      <circle cx="32" cy="20" r="2" fill="#C9A84C"/>
      <circle cx="32" cy="20" r="1" fill="#E8C97A"/>
      
      {/* Base plato */}
      <rect x="20" y="38" width="24" height="2" rx="1" fill="#C9A84C" fillOpacity="0.4"/>
    </svg>
  )
}