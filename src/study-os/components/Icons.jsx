/**
 * Inline SVG icons (Ionicons-style) – no emoji, no external lib.
 * All icons 24px viewBox, currentColor for fill/stroke.
 */
const size = 24
const stroke = 'currentColor'
const strokeWidth = 2

export function IconBack({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

export function IconPlay({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8l6 4-6 4V8z" />
    </svg>
  )
}

export function IconPause({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8h1v8h-1zM13 8h1v8h-1z" />
    </svg>
  )
}

export function IconCalendar({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

export function IconPencil({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function IconGamepad({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 12h4M8 10v4M15 13h.01M18 11h.01M17 16H7a2 2 0 01-2-2V10a2 2 0 012-2h10a2 2 0 012 2v4a2 2 0 01-2 2z" />
    </svg>
  )
}

export function IconRadio({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a10 10 0 0110 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

export function IconChat({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

export function IconLayers({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  )
}

export function IconHelp({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  )
}

export function IconMic({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  )
}

export function IconVideo({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

export function IconFolder({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

export function IconFileText({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

export function IconMore({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  )
}

export function IconHeadphones({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
  )
}

export function IconChevronRight({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function IconSend({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2z" />
    </svg>
  )
}

export function IconWaveform({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v6M8 9v12M12 6v12M16 9v12M20 12v6" />
    </svg>
  )
}

export function IconChevronUp({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

export function IconPerson({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

export function IconSettings({ className = '', size: s = size }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42" />
    </svg>
  )
}

const iconMap = {
  back: IconBack,
  play: IconPlay,
  pause: IconPause,
  calendar: IconCalendar,
  pencil: IconPencil,
  gamepad: IconGamepad,
  radio: IconRadio,
  chat: IconChat,
  layers: IconLayers,
  help: IconHelp,
  mic: IconMic,
  video: IconVideo,
  folder: IconFolder,
  fileText: IconFileText,
  more: IconMore,
  headphones: IconHeadphones,
  chevronRight: IconChevronRight,
  send: IconSend,
  waveform: IconWaveform,
  chevronUp: IconChevronUp,
  person: IconPerson,
  settings: IconSettings,
  trash: IconTrash,
}

export function Icon({ name, className = '', size: s = size }) {
  const C = iconMap[name]
  if (!C) return null
  return <C className={className} size={s} />
}
