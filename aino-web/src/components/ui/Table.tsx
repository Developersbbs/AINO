export function Table({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', borderRadius: 14, border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', minWidth: 600 }}>{children}</table>
    </div>
  )
}

export function Thead({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      {children}
    </thead>
  )
}

export function Th({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', textAlign: 'left' }}>
      {children}
    </th>
  )
}

export function Tbody({ children }: Readonly<{ children: React.ReactNode }>) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, onClick }: Readonly<{ children: React.ReactNode; onClick?: () => void }>) {
  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: '1px solid #f1f5f9', cursor: onClick ? 'pointer' : 'default', transition: 'background 0.12s' }}
      className="tbl-row"
    >
      {children}
    </tr>
  )
}

export function Td({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap' }}>
      {children}
    </td>
  )
}
