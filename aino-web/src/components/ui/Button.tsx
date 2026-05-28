import { ButtonHTMLAttributes, CSSProperties, forwardRef, useState } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 10,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'background 0.15s, opacity 0.15s',
  border: 'none',
  outline: 'none',
  whiteSpace: 'nowrap',
}

type VariantStyles = { base: CSSProperties; hover: CSSProperties }

const variantMap: Record<string, VariantStyles> = {
  primary: {
    base:  { background: '#1e3c6e', color: 'white', border: 'none' },
    hover: { background: '#152d54' },
  },
  outline: {
    base:  { background: 'transparent', color: '#1e3c6e', border: '1.5px solid #1e3c6e' },
    hover: { background: 'rgba(30,60,110,0.05)' },
  },
  danger: {
    base:  { background: '#dc2626', color: 'white', border: 'none' },
    hover: { background: '#b91c1c' },
  },
  ghost: {
    base:  { background: 'transparent', color: '#475569', border: 'none' },
    hover: { background: '#f1f5f9' },
  },
  success: {
    base:  { background: '#059669', color: 'white', border: 'none' },
    hover: { background: '#047857' },
  },
}

const sizeMap: Record<string, CSSProperties> = {
  sm: { fontSize: 12, padding: '6px 12px' },
  md: { fontSize: 13, padding: '9px 18px' },
  lg: { fontSize: 15, padding: '12px 24px' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, style, ...props }, ref) => {
    const [hovered, setHovered] = useState(false)
    const v = variantMap[variant]

    const computedStyle: CSSProperties = {
      ...baseStyle,
      ...v.base,
      ...sizeMap[size],
      ...(hovered && !disabled && !loading ? v.hover : {}),
      ...(disabled || loading ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
      ...style,
    }

    return (
      <button
        ref={ref}
        style={computedStyle}
        disabled={disabled || loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
