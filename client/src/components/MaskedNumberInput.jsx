import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const VARIANTS = {
  currency:   { prefix: 'R$ ', decimals: 2, suffix: '' },
  currency3:  { prefix: 'R$ ', decimals: 3, suffix: '' },
  km:         { prefix: '',     decimals: 1, suffix: ' km' },
  kwh:        { prefix: '',     decimals: 2, suffix: ' kWh' },
  volume_l:   { prefix: '',     decimals: 2, suffix: ' L' },
  volume_m3:  { prefix: '',     decimals: 2, suffix: ' m³' },
  consumption:{ prefix: '',     decimals: 1, suffix: ' km/l' },
}

function formatDisplay(digits, decimals, prefix, suffix) {
  const padded = (digits || '').padStart(decimals + 1, '0')
  const intPart = padded.slice(0, -decimals)
  const decPart = padded.slice(-decimals)
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${prefix}${intFormatted},${decPart}${suffix}`
}

function numberToDigits(num, decimals) {
  if (!num || isNaN(num)) return ''
  const fixed = num.toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  return (intPart + decPart).replace(/^0+/, '') || ''
}

function digitsToNumber(digits, decimals) {
  if (!digits) return 0
  const padded = digits.padStart(decimals + 1, '0')
  return parseFloat(`${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`)
}

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
  const finalPrefix = prefix !== undefined ? prefix : cfg.prefix
  const finalSuffix = suffix !== undefined ? suffix : cfg.suffix
  const finalDecimals = decimals !== undefined ? decimals : cfg.decimals

  const [digits, setDigits] = useState(() => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return num && !isNaN(num) ? numberToDigits(num, finalDecimals) : ''
  })
  const lastEmitted = useRef(value)
  const lastDecimals = useRef(finalDecimals)
  const inputRef = useRef(null)

  useEffect(() => {
    if (value !== lastEmitted.current || finalDecimals !== lastDecimals.current) {
      const num = typeof value === 'string' ? parseFloat(value) : value
      setDigits(num && !isNaN(num) ? numberToDigits(num, finalDecimals) : '')
      lastEmitted.current = value
      lastDecimals.current = finalDecimals
    }
  }, [value, finalDecimals])

  const display = formatDisplay(digits, finalDecimals, finalPrefix, finalSuffix)

  const emit = (newDigits) => {
    setDigits(newDigits)
    const num = digitsToNumber(newDigits, finalDecimals)
    lastEmitted.current = num
    onChange?.(num)
  }

  const handleKeyDown = (e) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      emit(digits + e.key)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      emit(digits.slice(0, -1))
    } else if (e.key === 'Delete' || e.key === 'Escape') {
      e.preventDefault()
      emit('')
    } else if (e.key !== 'Tab' && e.key !== 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
    }
  }

  const handleClear = (e) => {
    e.preventDefault()
    emit('')
    inputRef.current?.focus()
  }

  const isSm = size === 'sm'
  const inputBase = isSm
    ? 'bg-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none'
    : 'bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const iconSize = isSm ? 'w-4 h-4' : 'w-5 h-5'
  const iconPad = isSm ? 'pl-8' : 'pl-10'
  const clearPad = isSm ? 'pr-7' : 'pr-9'

  return (
    <div className={`relative w-full ${className}`}>
      {Icon && (
        <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconSize} text-slate-500 pointer-events-none`} />
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onKeyDown={handleKeyDown}
        className={`w-full ${inputBase} ${Icon ? iconPad : ''} ${digits ? clearPad : ''} cursor-text`}
        {...rest}
      />
      {digits && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleClear}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${iconSize} text-slate-500 hover:text-slate-300 flex items-center justify-center`}
        >
          <X className={isSm ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      )}
    </div>
  )
}
