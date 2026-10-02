import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Variant configuration.
 *  - mode: 'fixed'    → RTL digit mask with a FIXED number of decimals (currency, kWh, L, m³).
 *                      Typing "13245" with decimals=2 produces "132,45".
 *  - mode: 'natural'  → integer with an OPTIONAL decimal (odometer KM).
 *                      Typing "13245" produces "13245"; "13245,2" produces "13245,2".
 *
 * Units (prefix/suffix) are rendered as STATIC visual adornments OUTSIDE the
 * editable <input>, so the text cursor never collides with unit labels.
 * The value emitted via onChange is always a pure Number (Float/Integer),
 * stripped of any visual separators or symbols.
 */
const VARIANTS = {
  currency:    { prefix: 'R$',  suffix: '',     decimals: 2, mode: 'fixed' },
  currency3:   { prefix: 'R$',  suffix: '',     decimals: 3, mode: 'fixed' },
  km:          { prefix: '',    suffix: 'km',   decimals: 1, mode: 'natural' },
  kwh:         { prefix: '',    suffix: 'kWh',  decimals: 2, mode: 'fixed' },
  volume_l:    { prefix: '',    suffix: 'L',    decimals: 2, mode: 'fixed' },
  volume_m3:   { prefix: '',    suffix: 'm³',   decimals: 2, mode: 'fixed' },
  consumption: { prefix: '',    suffix: 'km/l', decimals: 1, mode: 'fixed' },
}

/* ── fixed mode helpers (RTL digit accumulation) ─────────────────────── */

function formatFixed(digits, decimals) {
  const padded = (digits || '').padStart(decimals + 1, '0')
  const intPart = padded.slice(0, -decimals)
  const decPart = padded.slice(-decimals)
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${intFormatted},${decPart}`
}

function numberToFixedDigits(num, decimals) {
  if (num == null || num === '') return ''
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return ''
  const fixed = n.toFixed(decimals)
  const [i, d] = fixed.split('.')
  return (i + d).replace(/^0+/, '') || ''
}

function fixedDigitsToNumber(digits, decimals) {
  if (!digits) return 0
  const padded = digits.padStart(decimals + 1, '0')
  return parseFloat(`${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`)
}

/* ── natural mode helpers (integer + optional decimal) ──────────────── */

function formatNatural(rawText) {
  if (!rawText) return ''
  const [intPart, decPart] = rawText.split('.')
  const intNum = (intPart || '0').replace(/^0+/, '') || '0'
  const intFmt = intNum.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart !== undefined ? `${intFmt},${decPart}` : intFmt
}

function numberToRawText(num, decimals) {
  if (num == null || num === '') return ''
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return ''
  return String(parseFloat(n.toFixed(decimals)))
}

function rawTextToNumber(rawText) {
  if (!rawText) return 0
  return parseFloat(rawText) || 0
}

/* ── component ──────────────────────────────────────────────────────── */

export default function MaskedNumberInput({
  value = 0,
  onChange,
  variant = 'currency',
  prefix,
  suffix,
  decimals,
  icon: Icon,
  size = 'default',
  className = '',
  ...rest
}) {
  const cfg = VARIANTS[variant] || VARIANTS.currency
  const finalPrefix = (prefix !== undefined ? prefix : cfg.prefix).trim()
  const finalSuffix = (suffix !== undefined ? suffix : cfg.suffix).trim()
  const finalDecimals = decimals !== undefined ? decimals : cfg.decimals
  const mode = cfg.mode

  const [digits, setDigits] = useState(() => mode === 'fixed' ? numberToFixedDigits(value, finalDecimals) : '')   // fixed mode
  const [rawText, setRawText] = useState(() => mode === 'natural' ? numberToRawText(value, finalDecimals) : '') // natural mode
  const lastEmitted = useRef(value)
  const inputRef = useRef(null)

  // sync from external value changes
  useEffect(() => {
    if (value !== lastEmitted.current) {
      const num = typeof value === 'string' ? parseFloat(value) : value
      if (mode === 'fixed') {
        setDigits(numberToFixedDigits(num, finalDecimals))
      } else {
        setRawText(numberToRawText(num, finalDecimals))
      }
      lastEmitted.current = value
    }
  }, [value, finalDecimals, mode])

  const display = mode === 'fixed'
    ? formatFixed(digits, finalDecimals)
    : formatNatural(rawText)

  const hasValue = mode === 'fixed' ? !!digits : !!rawText

  const emitFixed = (newDigits) => {
    setDigits(newDigits)
    const num = fixedDigitsToNumber(newDigits, finalDecimals)
    lastEmitted.current = num
    onChange?.(num)
  }

  const emitNatural = (newRaw) => {
    setRawText(newRaw)
    const num = rawTextToNumber(newRaw)
    lastEmitted.current = num
    onChange?.(num)
  }

  const handleKeyDown = (e) => {
    if (mode === 'fixed') {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        emitFixed(digits + e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        emitFixed(digits.slice(0, -1))
      } else if (e.key === 'Delete' || e.key === 'Escape') {
        e.preventDefault()
        emitFixed('')
      } else if (e.key !== 'Tab' && e.key !== 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
      }
    } else {
      // natural mode — integer with optional decimal
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        const [intPart, decPart] = rawText.split('.')
        if (decPart !== undefined) {
          if (decPart.length < finalDecimals) {
            emitNatural(intPart + '.' + decPart + e.key)
          }
          // else: max decimals reached, ignore
        } else {
          emitNatural(rawText + e.key)
        }
      } else if (e.key === ',' || e.key === '.') {
        e.preventDefault()
        if (!rawText.includes('.')) {
          emitNatural((rawText || '0') + '.')
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        emitNatural(rawText.slice(0, -1))
      } else if (e.key === 'Delete' || e.key === 'Escape') {
        e.preventDefault()
        emitNatural('')
      } else if (e.key !== 'Tab' && e.key !== 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
      }
    }
  }

  // cursor always goes to the end — never selects text, never lands mid-string
  const placeCursorEnd = (e) => {
    const el = e.target
    requestAnimationFrame(() => {
      const len = el.value.length
      el.setSelectionRange(len, len)
    })
  }

  // sanitize pasted content — extract only digits (and a single decimal separator for natural mode)
  const handlePaste = (e) => {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData('text') || ''
    const cleaned = text.replace(/[^\d.,]/g, '')
    if (mode === 'fixed') {
      const onlyDigits = cleaned.replace(/\D/g, '')
      if (onlyDigits) emitFixed(onlyDigits)
    } else {
      const normalized = cleaned.replace(/[.]/g, ',').replace(/,.*$/, m => m.slice(0, finalDecimals + 1))
      const parts = normalized.split(',')
      const intDigits = (parts[0] || '').replace(/\D/g, '')
      const decDigits = parts[1] !== undefined ? parts[1].replace(/\D/g, '').slice(0, finalDecimals) : undefined
      emitNatural(decDigits !== undefined ? `${intDigits}.${decDigits}` : intDigits)
    }
  }

  const handleClear = (e) => {
    e.preventDefault()
    if (mode === 'fixed') emitFixed('')
    else emitNatural('')
    inputRef.current?.focus()
  }

  const isSm = size === 'sm'
  const iconSize = isSm ? 'w-4 h-4' : 'w-5 h-5'
  const adornText = isSm ? 'text-xs' : 'text-sm'
  const containerBase = isSm
    ? 'bg-slate-700 rounded'
    : 'bg-slate-800 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500'
  const inputText = isSm ? 'text-xs py-1.5' : 'text-sm py-2.5'

  return (
    <div className={`flex items-center w-full ${containerBase} ${className}`}>
      {Icon && (
        <Icon className={`flex-shrink-0 ml-3 ${iconSize} text-slate-500 pointer-events-none`} />
      )}
      {finalPrefix && (
        <span className={`flex-shrink-0 ml-2 font-medium text-slate-400 ${adornText}`}>
          {finalPrefix}
        </span>
      )}
      <input
        {...rest}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={placeCursorEnd}
        onClick={placeCursorEnd}
        className={`flex-1 min-w-0 bg-transparent text-white ${inputText} px-2 focus:outline-none`}
      />
      {finalSuffix && (
        <span className={`flex-shrink-0 mr-2 font-medium text-slate-400 ${adornText}`}>
          {finalSuffix}
        </span>
      )}
      {hasValue && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleClear}
          className={`flex-shrink-0 mr-2 ${iconSize} text-slate-500 hover:text-slate-300 flex items-center justify-center`}
        >
          <X className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      )}
    </div>
  )
}
