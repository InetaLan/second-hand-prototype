import { ReactNode, useEffect } from "react"

export function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, ReactNode> = {
    home: (<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>),
    heart: <path d="M20.5 9.5c0 5-8.5 10.5-8.5 10.5S3.5 14.5 3.5 9.5A4.5 4.5 0 0 1 12 7.4a4.5 4.5 0 0 1 8.5 2.1Z" />,
    user: (<><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.5-4 3-6 7-6s6.5 2 7 6" /></>),
    camera: (<><path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" /><circle cx="12" cy="13" r="3.5" /></>),
    image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 3.5 3 2.5-2 5 5" /></>),
    arrow: <path d="m9 5 7 7-7 7" />,
    back: <path d="m15 5-7 7 7 7" />,
    sparkle: (<><path d="M12 2c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6Z" /><path d="M19 15c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3Z" /></>),
    check: <path d="m5 12 4 4L19 6" />,
    edit: <path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    upload: (<><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 14v6h14v-6" /></>),
    info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.1" /></>),
    eye: (<><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>),
    more: (<><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>),
    refresh: (<><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>),
    undo: (<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
    alert: (<><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17v.1" /></>),
    lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
    chat: <path d="M4 5h16v11H9l-5 4Z" />,
    send: <path d="m4 12 16-8-6 16-2-7Z" />,
    globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>),
    flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
    settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
    wifi: (<><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r=".8" fill="currentColor" /></>),
    trash: (<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>),
    tag: (<><path d="M3 12V4h8l10 10-8 8Z" /><circle cx="7.5" cy="8.5" r="1.3" /></>),
    thumbdown: <path d="M7 4h10v9l-4 7-1.5-1 1-5H5l-1-2 2-8ZM17 4h3v9h-3" />,
    layers: (<><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /></>),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Logo() {
  return (
    <div className="logo" aria-label="Antras kartas">
      <span className="logo-mark">a</span>
      <span>Antras kartas</span>
    </div>
  )
}

export type ConfKind = "high" | "check" | "manual" | "ai" | "empty" | "user"
export function Confidence({ kind }: { kind: ConfKind }) {
  const values: Record<ConfKind, [string, string]> = {
    high: ["✓", "DI · patikima"],
    check: ["?", "patikrinkite"],
    manual: ["✎", "įveskite patys"],
    ai: ["✦", "parengė DI"],
    empty: ["–", "DI nenustatė"],
    user: ["✎", "jūsų įvesta"],
  }
  return (
    <em className={`confidence ${kind}`}>
      <b>{values[kind][0]}</b>
      {values[kind][1]}
    </em>
  )
}

export function Modal({ open, onClose, children, wide = false, label }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; label: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={label} onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Uždaryti">
          <Icon name="close" size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}

export function Highlight({ src, box }: { src: string; box?: { x: number; y: number; w: number; h: number } }) {
  return (
    <div className="highlight">
      <img src={src} alt="" />
      {box && <span style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }} />}
    </div>
  )
}
