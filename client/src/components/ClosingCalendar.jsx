import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Coffee, Edit } from 'lucide-react'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function ClosingCalendar({ closings, dayOffs, onDayClick, onMarkDayOff, onRemoveDayOff, onNewClosing }) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Build a map of date string -> closing and date string -> dayOff
  const closingMap = useMemo(() => {
    const map = {}
    closings.forEach(c => {
      const d = new Date(c.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      map[key] = c
    })
    return map
  }, [closings])

  const dayOffMap = useMemo(() => {
    const map = {}
    dayOffs.forEach(d => {
      const dt = new Date(d.date)
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
      map[key] = d
    })
    return map
  }, [dayOffs])

  // Generate calendar days
  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startWeekday = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

    const cells = []
    // Empty cells before the 1st
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ empty: true, key: `empty-${i}` })
    }
    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      const key = `${year}-${month}-${d}`
      cells.push({
        day: d,
        key,
        closing: closingMap[key] || null,
        dayOff: dayOffMap[key] || null,
        isToday: key === todayKey,
      })
    }
    return cells
  }, [year, month, closingMap, dayOffMap])

  const monthLabel = `${MONTHS[month]} ${year}`

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-white min-w-[140px] text-center">{monthLabel}</h2>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
          className="text-xs text-slate-400 hover:text-emerald-400 font-medium px-2 py-1 rounded transition"
        >
          Hoje
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="text-center text-[10px] font-semibold text-slate-500 uppercase py-1">{wd}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(cell => {
          if (cell.empty) return <div key={cell.key} className="min-h-[72px]" />

          const { day, closing, dayOff, isToday } = cell

          let bg = 'bg-slate-800/30'
          let border = 'border-slate-800'
          let textColor = 'text-slate-500'
          let content = null

          if (closing) {
            bg = 'bg-emerald-500/10'
            border = 'border-emerald-500/30'
            textColor = 'text-white'
            content = (
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] text-emerald-400 font-medium truncate">R$ {closing.netProfit.toFixed(0)}</p>
                <p className="text-[9px] text-slate-400 truncate">{closing.kmDriven.toFixed(0)} km</p>
              </div>
            )
          } else if (dayOff) {
            bg = 'bg-amber-500/10'
            border = 'border-amber-500/30'
            textColor = 'text-amber-400'
            content = (
              <div className="mt-1 flex items-center justify-center">
                <Coffee className="w-3.5 h-3.5 text-amber-400/70" />
              </div>
            )
          } else {
            content = (
              <div className="mt-1 flex items-center justify-center">
                <Plus className="w-3 h-3 text-slate-600" />
              </div>
            )
          }

          return (
            <div
              key={cell.key}
              onClick={() => onDayClick(cell)}
              className={`min-h-[72px] rounded-lg border ${border} ${bg} p-1.5 cursor-pointer hover:border-slate-600 transition ${isToday ? 'ring-1 ring-emerald-500' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${textColor}`}>{day}</span>
                {closing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDayClick(cell) }}
                    className="text-slate-500 hover:text-white"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
                {dayOff && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveDayOff(dayOff) }}
                    className="text-amber-400/50 hover:text-red-400"
                  >
                    <span className="text-[10px]">×</span>
                  </button>
                )}
              </div>
              {content}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40" />
          <span className="text-[10px] text-slate-400">Fechamento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Coffee className="w-2 h-2 text-amber-400/70" />
          </div>
          <span className="text-[10px] text-slate-400">Folga</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-800/50 border border-slate-800" />
          <span className="text-[10px] text-slate-400">Sem registro</span>
        </div>
      </div>
    </div>
  )
}
