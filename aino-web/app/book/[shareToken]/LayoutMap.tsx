'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './LayoutMap.module.css';
import type { Unit, UnitStatus, Project } from './page';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  project: Project;
  units: Unit[];
  agentId: string | null;
  shareToken: string;
  backendUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAIL_BG     = '#DCFCE7';
const AVAIL_BORDER = '#86EFAC';
const AVAIL_TEXT   = '#15803D';
const BOOKED_BG    = '#FEF9C3';
const BOOKED_BORDER= '#FDE047';
const BOOKED_TEXT  = '#A16207';
const SOLD_BG      = '#FFE4E6';
const SOLD_BORDER  = '#FCA5A5';
const SOLD_TEXT    = '#BE123C';
const NAVY         = '#1A2744';

const STATUS_BG:     Record<UnitStatus, string> = { Available: AVAIL_BG,    Booked: BOOKED_BG,    Sold: SOLD_BG     };
const STATUS_BORDER: Record<UnitStatus, string> = { Available: AVAIL_BORDER, Booked: BOOKED_BORDER, Sold: SOLD_BORDER };
const STATUS_TEXT:   Record<UnitStatus, string> = { Available: AVAIL_TEXT,  Booked: BOOKED_TEXT,  Sold: SOLD_TEXT   };

type Tab = 'home' | 'map' | 'bookings';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUnit(unitNumber: string): { block: string; col: number } {
  // Strip any leading non-alphanumeric characters (e.g. "#" in "#PLOT-1")
  const s = unitNumber.replace(/^[^A-Za-z0-9]+/, '');

  // "A1", "B12", "PLOT1"
  const m1 = s.match(/^([A-Za-z]+)(\d+)$/);
  if (m1) return { block: m1[1].toUpperCase(), col: parseInt(m1[2], 10) };

  // "PLOT-1", "A-1", "BLOCK_2" (letter + separator + number)
  const m2 = s.match(/^([A-Za-z]+)[^A-Za-z0-9]+(\d+)$/);
  if (m2) return { block: m2[1].toUpperCase(), col: parseInt(m2[2], 10) };

  // Pure number: "1", "101"
  const n = parseInt(s, 10);
  if (!isNaN(n) && n > 0) return { block: 'PLOT', col: n };

  // Last resort: first char as block, index 1 as col (handled by caller)
  return { block: (s[0] ?? 'X').toUpperCase(), col: -1 };
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── PlotGrid ─────────────────────────────────────────────────────────────────

function PlotCell({
  unit, block, filterStatus, filterBlocks, onPlotClick, className,
}: {
  unit: Unit; block: string;
  filterStatus: Set<UnitStatus>; filterBlocks: Set<string>;
  onPlotClick: (u: Unit) => void; className?: string;
}) {
  const visible = filterStatus.has(unit.status) &&
    (filterBlocks.size === 0 || filterBlocks.has(block));
  const canBook = unit.status === 'Available' && visible;

  return (
    <button
      className={className ?? styles.plotCell}
      style={{
        background: STATUS_BG[unit.status],
        borderColor: STATUS_BORDER[unit.status],
        color: STATUS_TEXT[unit.status],
        opacity: visible ? 1 : 0.2,
        cursor: canBook ? 'pointer' : 'default',
      }}
      onClick={() => { if (canBook) onPlotClick(unit); }}
    >
      {unit.unit_number}
    </button>
  );
}

function PlotGrid({
  units, filterStatus, filterBlocks,
  onPlotClick,
}: {
  units: Unit[];
  filterStatus: Set<UnitStatus>;
  filterBlocks: Set<string>;
  onPlotClick: (unit: Unit) => void;
}) {
  // Re-assign col=-1 units a sequential column within their block
  const rawParsed = units.map(u => ({ ...parseUnit(u.unit_number), unit: u }));

  const needsAutoCol = rawParsed.some(p => p.col === -1);
  const parsed = needsAutoCol
    ? rawParsed.map((p, i) => p.col === -1 ? { ...p, col: i + 1 } : p)
    : rawParsed;

  const blockMap: Record<string, Record<number, (typeof parsed)[0]>> = {};
  parsed.forEach(p => {
    if (!blockMap[p.block]) blockMap[p.block] = {};
    blockMap[p.block][p.col] = p;
  });

  const blockKeys = Object.keys(blockMap).sort();
  const maxCol = blockKeys.length
    ? Math.max(...blockKeys.flatMap(b => Object.keys(blockMap[b]).map(Number)))
    : 0;

  // Fallback: card grid for non-structured unit numbers (single block or maxCol too large)
  const useCards = maxCol === 0 || maxCol > 20 || (blockKeys.length === 1 && maxCol > 10);

  if (useCards) {
    return (
      <div className={styles.cardGrid}>
        {units.map(u => {
          const block = parseUnit(u.unit_number).block;
          return (
            <PlotCell
              key={u.id}
              unit={u}
              block={block}
              filterStatus={filterStatus}
              filterBlocks={filterBlocks}
              onPlotClick={onPlotClick}
              className={styles.plotCard}
            />
          );
        })}
      </div>
    );
  }

  const cols = Array.from({ length: maxCol }, (_, i) => i + 1);

  return (
    <div className={styles.gridWrapper}>
      <table className={styles.gridTable}>
        <thead>
          <tr>
            <th className={styles.cornerCell}></th>
            {cols.map(c => (
              <th key={c} className={styles.colHeader}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blockKeys.map(block => (
            <tr key={block}>
              <th className={styles.rowLabel}>{block}</th>
              {cols.map(c => {
                const p = blockMap[block][c];
                if (!p) return <td key={c} className={styles.emptyCell} />;
                return (
                  <td key={c}>
                    <PlotCell
                      unit={p.unit}
                      block={block}
                      filterStatus={filterStatus}
                      filterBlocks={filterBlocks}
                      onPlotClick={onPlotClick}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── BlockSummary ─────────────────────────────────────────────────────────────

function BlockSummary({ units }: { units: Unit[] }) {
  const parsed = units.map(u => ({ ...parseUnit(u.unit_number), unit: u }));
  const blockMap: Record<string, { total: number; avail: number; booked: number }> = {};
  parsed.forEach(({ block, unit: u }) => {
    if (!blockMap[block]) blockMap[block] = { total: 0, avail: 0, booked: 0 };
    blockMap[block].total++;
    if (u.status === 'Available') blockMap[block].avail++;
    if (u.status === 'Booked')    blockMap[block].booked++;
  });

  return (
    <table className={styles.summaryTable}>
      <thead>
        <tr>
          <th>BLOCK</th><th>TOTAL</th><th>AVAIL</th><th>BOOKED</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(blockMap).sort().map(block => {
          const b = blockMap[block];
          return (
            <tr key={block}>
              <td className={styles.blockLabel}>Block {block}</td>
              <td>{b.total}</td>
              <td style={{ color: AVAIL_TEXT, fontWeight: 700 }}>{b.avail}</td>
              <td style={{ color: BOOKED_TEXT, fontWeight: 700 }}>{b.booked}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── HomeTab ─────────────────────────────────────────────────────────────────

function HomeTab({ project, units, backendUrl }: { project: Project; units: Unit[]; backendUrl: string }) {
  const avail  = units.filter(u => u.status === 'Available').length;
  const booked = units.filter(u => u.status === 'Booked').length;
  const sold   = units.filter(u => u.status === 'Sold').length;

  return (
    <div>
      <div className={styles.heroSection}>
        <div className={styles.heroName}>{project.name}</div>
        <div className={styles.heroLoc}>📍 {project.location}</div>
        <div className={styles.heroBadges}>
          {project.type && <span className={styles.heroBadge}>{project.type}</span>}
          {project.reraNumber && <span className={styles.heroBadge}>RERA: {project.reraNumber}</span>}
        </div>
      </div>

      <div className={styles.infoCards}>
        {[
          { label: 'Total Plots', value: units.length, sub: 'in this layout', color: NAVY },
          { label: 'Available',   value: avail,        sub: 'plots open',     color: AVAIL_TEXT },
          { label: 'Booked',      value: booked,       sub: 'reserved',       color: BOOKED_TEXT },
          { label: 'Sold',        value: sold,         sub: 'completed',      color: SOLD_TEXT },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={styles.infoCard}>
            <div className={styles.infoCardLabel}>{label}</div>
            <div className={styles.infoCardValue} style={{ color }}>{value}</div>
            <div className={styles.infoCardSub}>{sub}</div>
          </div>
        ))}
      </div>

      {project.layoutImageUrl ? (
        <div className={styles.layoutImgWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${backendUrl}${project.layoutImageUrl}`} alt="Layout" className={styles.layoutImg} />
        </div>
      ) : (
        <div className={styles.layoutPlaceholder}>🗺 Layout image not uploaded yet</div>
      )}

      {project.documents && project.documents.length > 0 && (
        <div className={styles.docsSection}>
          <div className={styles.sectionTitle}>Documents</div>
          {project.documents.map((doc, i) => (
            <a key={i} href={`${backendUrl}${doc.url}`} target="_blank" rel="noopener noreferrer" className={styles.docItem}>
              <span>{doc.type === 'pdf' ? '📄' : '🖼️'} {doc.name}</span>
              <span className={styles.docArrow}>↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BookingSheet ─────────────────────────────────────────────────────────────

interface BookingRecord {
  bookingId: string;
  unitId: string;
  plotId: string;
  custName: string;
  custPhone: string;
  sqFt: number;
  price: number;
}

function BookingSheet({
  unit, agentId, shareToken, show,
  onClose, onBooked,
}: {
  unit: Unit | null;
  agentId: string | null;
  shareToken: string;
  show: boolean;
  onClose: () => void;
  onBooked: (rec: BookingRecord) => void;
}) {
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [record, setRecord]   = useState<BookingRecord | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && unit) {
      setName(''); setPhone('');
      setLoading(false); setConfirmed(false); setRecord(null);
      setTimeout(() => nameRef.current?.focus(), 400);
    }
  }, [show, unit]);

  async function submit() {
    if (!name.trim() || !phone.trim() || !unit) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          agentId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          shareToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Booking failed');

      const rec: BookingRecord = {
        bookingId: json.data?.bookingId ?? '—',
        unitId: unit.id,
        plotId: unit.unit_number,
        custName: name.trim(),
        custPhone: phone.trim(),
        sqFt: unit.sq_ft,
        price: unit.price,
      };
      setRecord(rec);
      setConfirmed(true);
      onBooked(rec);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={[styles.bottomSheet, show ? styles.bottomSheetShow : ''].join(' ')}>
      <div className={styles.sheetHandle} />

      {!confirmed && unit && (
        <div className={styles.sheetBody}>
          <div className={styles.plotHeader}>
            <div className={styles.plotBadge}>{unit.unit_number}</div>
            <span className={styles.availPill}>Available</span>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>AREA</div>
              <div className={styles.detailValue}>{unit.sq_ft.toLocaleString('en-IN')} <span className={styles.detailUnit}>sq ft</span></div>
            </div>
            <div className={styles.detailCard}>
              <div className={styles.detailLabel}>PRICE</div>
              <div className={styles.detailValue}>{formatINR(unit.price)}</div>
            </div>
            {unit.facing && (
              <div className={styles.detailCard}>
                <div className={styles.detailLabel}>FACING</div>
                <div className={styles.detailValue}>{unit.facing}</div>
              </div>
            )}
            {unit.road_width && (
              <div className={styles.detailCard}>
                <div className={styles.detailLabel}>ROAD WIDTH</div>
                <div className={styles.detailValue}>{unit.road_width} <span className={styles.detailUnit}>ft</span></div>
              </div>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.formSection}>
            <h3 className={styles.formTitle}>Your Details</h3>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Full Name</label>
              <input
                ref={nameRef}
                className={styles.input}
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Phone Number</label>
              <input
                className={styles.input}
                type="tel"
                placeholder="Enter your phone number"
                autoComplete="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              />
            </div>
            <button
              className={styles.bookBtn}
              onClick={submit}
              disabled={loading || !name.trim() || !phone.trim()}
            >
              {loading ? <span className={styles.spinner} /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {confirmed && record && (
        <div className={styles.sheetBody}>
          <div className={styles.confirmView}>
            <div className={styles.confirmIcon}>✅</div>
            <div className={styles.confirmTitle}>Booking Confirmed!</div>
            <div className={styles.confirmSub}>
              Plot {record.plotId} reserved for {record.custName}. Our team will call you on {record.custPhone}.
            </div>
            <div className={styles.confirmDetails}>
              {[
                ['Plot',  record.plotId],
                ['Area',  `${record.sqFt.toLocaleString('en-IN')} sq ft`],
                ['Price', formatINR(record.price)],
                ['Name',  record.custName],
                ['Phone', record.custPhone],
              ].map(([l, v]) => (
                <div key={l} className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>{l}</span>
                  <span className={styles.confirmVal}>{v}</span>
                </div>
              ))}
            </div>
            <button className={styles.bookBtn} onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FilterSheet ──────────────────────────────────────────────────────────────

function FilterSheet({
  show, allBlocks, activeStatus, activeBlocks,
  onApply, onClose,
}: {
  show: boolean;
  allBlocks: string[];
  activeStatus: Set<UnitStatus>;
  activeBlocks: Set<string>;
  onApply: (status: Set<UnitStatus>, blocks: Set<string>) => void;
  onClose: () => void;
}) {
  const [localStatus, setLocalStatus] = useState<Set<UnitStatus>>(new Set(activeStatus));
  const [localBlocks, setLocalBlocks] = useState<Set<string>>(new Set(activeBlocks));

  useEffect(() => {
    if (show) {
      setLocalStatus(new Set(activeStatus));
      setLocalBlocks(new Set(activeBlocks));
    }
  }, [show, activeStatus, activeBlocks]);

  function toggleStatus(s: UnitStatus) {
    setLocalStatus(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  function toggleBlock(b: string) {
    setLocalBlocks(prev => {
      const n = new Set(prev);
      n.has(b) ? n.delete(b) : n.add(b);
      return n;
    });
  }

  function reset() {
    const s = new Set<UnitStatus>(['Available', 'Booked', 'Sold']);
    const b = new Set<string>(allBlocks);
    setLocalStatus(s); setLocalBlocks(b);
    onApply(s, b);
  }

  const STATUS_STYLES: Record<UnitStatus, { bg: string; border: string; color: string }> = {
    Available: { bg: AVAIL_BG,    border: AVAIL_BORDER, color: AVAIL_TEXT  },
    Booked:    { bg: BOOKED_BG,   border: BOOKED_BORDER,color: BOOKED_TEXT },
    Sold:      { bg: SOLD_BG,     border: SOLD_BORDER,  color: SOLD_TEXT   },
  };

  return (
    <div className={[styles.filterSheet, show ? styles.filterSheetShow : ''].join(' ')}>
      <div className={styles.sheetHandle} />
      <div className={styles.sheetBody}>
        <div className={styles.filterHeader}>
          <span className={styles.filterTitle}>Filter Plots</span>
          <button className={styles.resetBtn} onClick={reset}>Reset</button>
        </div>

        <div className={styles.filterGroupLabel}>STATUS</div>
        <div className={styles.chips}>
          {(['Available', 'Booked', 'Sold'] as UnitStatus[]).map(s => {
            const active = localStatus.has(s);
            const st = STATUS_STYLES[s];
            return (
              <button
                key={s}
                className={styles.chip}
                style={active ? { background: st.bg, borderColor: st.border, color: st.color } : {}}
                onClick={() => toggleStatus(s)}
              >
                {s}
              </button>
            );
          })}
        </div>

        {allBlocks.length > 1 && (
          <>
            <div className={styles.filterGroupLabel}>BLOCK</div>
            <div className={styles.chips}>
              {allBlocks.map(b => {
                const active = localBlocks.size === 0 || localBlocks.has(b);
                return (
                  <button
                    key={b}
                    className={styles.chip}
                    style={active ? { background: '#E8EEF8', borderColor: NAVY, color: NAVY } : {}}
                    onClick={() => toggleBlock(b)}
                  >
                    Block {b}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          className={styles.bookBtn}
          style={{ marginTop: 8 }}
          onClick={() => onApply(localStatus, localBlocks)}
        >
          Apply Filter
        </button>
      </div>
    </div>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'home', label: 'Home',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'map', label: 'Map',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  },
  {
    id: 'bookings', label: 'Bookings',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlotMapUI({ project, units, agentId, shareToken, backendUrl }: Props) {
  const [tab, setTab]           = useState<Tab>('map');
  const [liveUnits, setLiveUnits] = useState<Unit[]>(units);
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Set<UnitStatus>>(new Set(['Available', 'Booked', 'Sold']));
  const [filterBlocks, setFilterBlocks] = useState<Set<string>>(new Set());
  const [bookingRecord, setBookingRecord] = useState<BookingRecord | null>(null);
  const [clock, setClock] = useState('');

  const overlayOpen = !!activeUnit || showFilter;

  const parsed = liveUnits.map(u => ({ ...parseUnit(u.unit_number), unit: u }));
  const allBlocks = [...new Set(parsed.map(p => p.block))].sort();

  const counts = {
    available: liveUnits.filter(u => u.status === 'Available').length,
    booked:    liveUnits.filter(u => u.status === 'Booked').length,
    sold:      liveUnits.filter(u => u.status === 'Sold').length,
  };

  // Clock tick
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  const titleMap: Record<Tab, string> = {
    home: 'Project', map: 'Plot Map', bookings: 'My Booking',
  };

  function closeAll() {
    setActiveUnit(null);
    setShowFilter(false);
  }

  return (
    <div className={styles.phone}>

      {/* ── Status Bar ── */}
      <div className={styles.statusBar}>
        <span className={styles.clock}>{clock || '9:41'}</span>
        <div className={styles.sbIcons}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.42 9a15.91 15.91 0 0 1 21.16 0M5 12.55a11 11 0 0 1 14.08 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
          </svg>
          <svg width="22" height="14" viewBox="0 0 26 14">
            <rect x="0" y="1" width="22" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
            <path d="M23 5v4a2 2 0 0 0 0-4z" fill="white"/>
            <rect x="2" y="3" width="14" height="8" rx="1" fill="white"/>
          </svg>
        </div>
      </div>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => { if (tab !== 'map') setTab('map'); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className={styles.headerText}>
            <div className={styles.hdrSubtitle}>{project.name}</div>
            <h1 className={styles.hdrTitle}>{titleMap[tab]}</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          <nav className={styles.desktopTabs}>
            {NAV_ITEMS.map(({ id, label, icon }) => (
              <button
                key={id}
                className={[styles.desktopTab, tab === id ? styles.desktopTabActive : ''].join(' ')}
                onClick={() => setTab(id)}
              >
                <span className={styles.navIcon}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          {tab === 'map' && (
            <button className={styles.filterBtn} onClick={() => setShowFilter(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              Filter
            </button>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      {tab === 'map' && (
        <div className={styles.legend}>
          <div className={styles.legItem}>
            <span className={styles.legDot} style={{ background: AVAIL_BG, borderColor: AVAIL_BORDER }} />
            <span className={styles.legLabel}>Available <b>{counts.available}</b></span>
          </div>
          <div className={styles.legItem}>
            <span className={styles.legDot} style={{ background: BOOKED_BG, borderColor: BOOKED_BORDER }} />
            <span className={styles.legLabel}>Booked <b>{counts.booked}</b></span>
          </div>
          <div className={styles.legItem}>
            <span className={styles.legDot} style={{ background: SOLD_BG, borderColor: SOLD_BORDER }} />
            <span className={styles.legLabel}>Sold <b>{counts.sold}</b></span>
          </div>
        </div>
      )}

      {/* ── Scrollable Content ── */}
      <div className={styles.content}>

        {/* Home tab */}
        {tab === 'home' && (
          <HomeTab project={project} units={liveUnits} backendUrl={backendUrl} />
        )}

        {/* Map tab */}
        {tab === 'map' && (
          <>
            <div className={styles.gridSection}>
              <PlotGrid
                units={liveUnits}
                filterStatus={filterStatus}
                filterBlocks={filterBlocks}
                onPlotClick={u => setActiveUnit(u)}
              />
            </div>
            <div className={styles.summarySection}>
              <div className={styles.sectionTitle}>Block Summary</div>
              <BlockSummary units={liveUnits} />
            </div>
          </>
        )}

        {/* Bookings tab */}
        {tab === 'bookings' && (
          <div className={styles.emptyTab}>
            {bookingRecord ? (
              <div className={styles.bookingCard}>
                <div className={styles.bookingSuccess}>✅ Booking Confirmed</div>
                <div className={styles.bookingId}>ID: {bookingRecord.bookingId}</div>
                {[
                  ['Plot',  bookingRecord.plotId],
                  ['Name',  bookingRecord.custName],
                  ['Phone', bookingRecord.custPhone],
                  ['Area',  `${bookingRecord.sqFt.toLocaleString('en-IN')} sq ft`],
                  ['Price', formatINR(bookingRecord.price)],
                ].map(([l, v]) => (
                  <div key={l} className={styles.confirmRow}>
                    <span className={styles.confirmLabel}>{l}</span>
                    <span className={styles.confirmVal}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className={styles.emptyIcon}>📋</div>
                <div className={styles.emptyTitle}>No Booking Yet</div>
                <div className={styles.emptyDesc}>Tap an available plot on the Map tab to book.</div>
                <button className={styles.goMapBtn} onClick={() => setTab('map')}>View Plot Map</button>
              </>
            )}
          </div>
        )}



      </div>

      {/* ── Bottom Nav ── */}
      <nav className={styles.bottomNav}>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            className={[styles.navItem, tab === id ? styles.navActive : ''].join(' ')}
            onClick={() => setTab(id)}
          >
            <span className={styles.navIcon}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* ── Overlay ── */}
      <div
        className={[styles.overlay, overlayOpen ? styles.overlayShow : ''].join(' ')}
        onClick={closeAll}
      />

      {/* ── Plot Booking Sheet ── */}
      <BookingSheet
        unit={activeUnit}
        agentId={agentId}
        shareToken={shareToken}
        show={!!activeUnit}
        onClose={closeAll}
        onBooked={rec => {
          setBookingRecord(rec);
          setLiveUnits(prev => prev.map(u => u.id === rec.unitId ? { ...u, status: 'Booked' } : u));
        }}
      />

      {/* ── Filter Sheet ── */}
      <FilterSheet
        show={showFilter}
        allBlocks={allBlocks}
        activeStatus={filterStatus}
        activeBlocks={filterBlocks}
        onApply={(s, b) => { setFilterStatus(s); setFilterBlocks(b); setShowFilter(false); }}
        onClose={() => setShowFilter(false)}
      />

    </div>
  );
}
