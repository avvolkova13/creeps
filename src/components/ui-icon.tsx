type IconName = 'arrow' | 'swap' | 'plus' | 'close' | 'check' | 'trash';

/** One optical size and stroke for interface actions. */
export function UiIcon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'arrow' && <path d="M6 18 18 6M6 6h12v12" />}
    {name === 'swap' && <path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" />}
    {name === 'plus' && <><path d="M5 12h14" /><path className="icon-vertical" d="M12 5v14" /></>}
    {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
    {name === 'check' && <path d="m5 12 4 4L19 6" />}
    {name === 'trash' && <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />}
  </svg>;
}
