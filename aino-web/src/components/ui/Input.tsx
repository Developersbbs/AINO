import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftAddon, rightAddon, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftAddon && (
            <span style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }}>
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: 'white',
              paddingTop: 9,
              paddingBottom: 9,
              paddingLeft: leftAddon ? 36 : 12,
              paddingRight: rightAddon ? 36 : 12,
              fontSize: 13,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
              ...(error ? { borderColor: '#f87171' } : {}),
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1e3c6e'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,60,110,0.12)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? '#f87171' : '#e2e8f0'
              e.currentTarget.style.boxShadow = 'none'
            }}
            {...props}
          />
          {rightAddon && (
            <span style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }}>
              {rightAddon}
            </span>
          )}
        </div>
        {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
