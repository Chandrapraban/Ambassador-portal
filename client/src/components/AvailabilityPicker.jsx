import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay,
  addMonths, subMonths,
} from 'date-fns'
import { getTimezoneAbbr } from '../utils/timezone'

const TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM'
]

export default function AvailabilityPicker({ value = [], onChange, timezone }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  function getSlot(date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return value.find(s => s.date === dateStr)
  }

  function toggleDate(date) {
    if (isBefore(date, today)) return
    const dateStr = format(date, 'yyyy-MM-dd')
    if (value.find(s => s.date === dateStr)) {
      onChange(value.filter(s => s.date !== dateStr))
    } else {
      onChange([...value, { date: dateStr, times: [] }].sort((a, b) => a.date.localeCompare(b.date)))
    }
  }

  function toggleTime(dateStr, time) {
    onChange(value.map(slot => {
      if (slot.date !== dateStr) return slot
      const times = slot.times.includes(time)
        ? slot.times.filter(t => t !== time)
        : [...slot.times, time]
      return { ...slot, times }
    }))
  }

  function removeDate(dateStr) {
    onChange(value.filter(s => s.date !== dateStr))
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            &#8592;
          </button>
          <span className="font-semibold text-gray-800">{format(currentMonth, 'MMMM yyyy')}</span>
          <button
            type="button"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
          >
            &#8594;
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 py-1 w-10">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map(day => {
            const isPast = isBefore(day, today)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const slot = getSlot(day)
            const isSelected = !!slot
            const hasTime = slot && slot.times.length > 0

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => isCurrentMonth && !isPast && toggleDate(day)}
                disabled={isPast || !isCurrentMonth}
                className={[
                  'relative w-10 h-10 text-sm rounded-full flex items-center justify-center transition-colors',
                  !isCurrentMonth ? 'invisible' : '',
                  isPast ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer',
                  isSelected
                    ? 'bg-duke-blue text-white font-medium'
                    : isPast
                    ? ''
                    : isToday(day)
                    ? 'font-bold text-duke-blue hover:bg-blue-50'
                    : 'hover:bg-blue-50 text-gray-700',
                ].join(' ')}
              >
                {format(day, 'd')}
                {hasTime && (
                  <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-green-400 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Click dates to add availability</p>
        {timezone && (
          <p className="text-xs text-center mt-1 text-duke-blue font-medium">
            Times are in {getTimezoneAbbr(timezone)}
          </p>
        )}
      </div>

      {/* Time slot panel */}
      <div className="flex-1 min-w-0">
        {value.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-32 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm text-center px-4">
              Select dates on the calendar to add your available time slots
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {value.map(slot => {
              const displayDate = new Date(slot.date + 'T12:00:00')
              return (
                <div key={slot.date} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-800">
                      {format(displayDate, 'EEEE, MMMM d')}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDate(slot.date)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => toggleTime(slot.date, time)}
                        className={[
                          'text-xs px-2 py-1 rounded-md border transition-colors',
                          slot.times.includes(time)
                            ? 'bg-duke-blue text-white border-duke-blue'
                            : 'border-gray-200 text-gray-600 hover:border-duke-blue hover:text-duke-blue'
                        ].join(' ')}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  {slot.times.length === 0 && (
                    <p className="text-xs text-amber-500 mt-2">Select at least one time slot for this date</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
