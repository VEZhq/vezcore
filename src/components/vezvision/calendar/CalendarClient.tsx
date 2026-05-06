'use client'

import { useState, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CalendarDays,
  X,
  Trash2,
  AlignLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCSRFToken } from '@/hooks/useCSRFToken'
import { useConfirm } from '@/components/ConfirmDialog'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/actions/vezvision/calendar'
import type { VVCalendarEvent } from '@/lib/actions/vezvision/types'

interface CalendarClientProps {
  initialEvents: VVCalendarEvent[]
  canManage: boolean
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Spotkanie: { label: 'Spotkanie', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  Deadline: { label: 'Deadline', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  Ważne: { label: 'Ważne', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  Osobiste: { label: 'Osobiste', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  Inne: { label: 'Inne', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  Praca: { label: 'Praca', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  Podróż: { label: 'Podróż', color: '#14b8a6', bg: '#f0fdfa', border: '#99f6e4' },
}

const CATEGORIES = Object.keys(CATEGORY_META)
const DEFAULT_CATEGORY = 'Inne'

const PRESET_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#f97316',
  '#84cc16',
]

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = (firstDay.getDay() + 6) % 7

  for (let i = 0; i < startPadding; i++) {
    days.push(new Date(year, month, -startPadding + i + 1))
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  const endPadding = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i))
  }
  return days
}

function formatDateInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function formatDateOnlyInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function CalendarClient({ initialEvents, canManage }: CalendarClientProps) {
  const { token: csrfToken } = useCSRFToken()
  const { confirm } = useConfirm()
  const [events, setEvents] = useState(initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<VVCalendarEvent | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [allDay, setAllDay] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = getDaysInMonth(year, month)
  const monthLabel = currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })

  const weekDays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
  const weekDaysShort = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']

  const today = new Date()

  const getEventsForDate = useCallback(
    (date: Date) => {
      const d = date.toISOString().slice(0, 10)
      return events.filter((e) => {
        const start = e.start_at.slice(0, 10)
        const end = e.end_at ? e.end_at.slice(0, 10) : start
        return d >= start && d <= end
      })
    },
    [events]
  )

  const upcomingEvents = events
    .filter((e) => new Date(e.start_at) >= new Date(today.toISOString().slice(0, 10)))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 5)

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const handleToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  const openNewEvent = (date?: Date) => {
    if (!canManage) return
    setEditingEvent(null)
    setSelectedDate(date ?? new Date())
    setAllDay(false)
    setShowDrawer(true)
  }

  const openEditEvent = (event: VVCalendarEvent) => {
    if (!canManage) return
    setEditingEvent(event)
    setSelectedDate(new Date(event.start_at))
    setAllDay(event.all_day ?? false)
    setShowDrawer(true)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    if (canManage) {
      setEditingEvent(null)
      setAllDay(false)
      setShowDrawer(true)
    }
  }

  const handleSave = async (formData: FormData) => {
    if (!csrfToken) {
      toast.error('Brak tokenu bezpieczeństwa')
      return
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const start_at = formData.get('start_at') as string
    const end_at = formData.get('end_at') as string
    const isAllDay = allDay
    const color = formData.get('color') as string
    const category = formData.get('category') as string

    if (!title.trim()) {
      toast.error('Tytuł jest wymagany')
      return
    }

    const input = {
      title: title.trim(),
      description: description.trim() || null,
      start_at,
      end_at: end_at || null,
      all_day: isAllDay,
      color,
      category,
    }

    if (editingEvent) {
      const result = await updateCalendarEvent(editingEvent.id, input, csrfToken)
      if (result.success) {
        toast.success('Wydarzenie zaktualizowane')
        setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? result.data : e)))
        setShowDrawer(false)
      } else {
        toast.error(result.error)
      }
    } else {
      const result = await createCalendarEvent(input, csrfToken)
      if (result.success) {
        toast.success('Wydarzenie utworzone')
        setEvents((prev) => [...prev, result.data])
        setShowDrawer(false)
      } else {
        toast.error(result.error)
      }
    }
  }

  const handleDelete = async () => {
    if (!editingEvent || !csrfToken) return
    const approved = await confirm({
      title: 'Usunąć wydarzenie?',
      message: `Czy na pewno chcesz usunąć wydarzenie „${editingEvent.title}"?`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!approved) return

    const result = await deleteCalendarEvent(editingEvent.id, csrfToken)
    if (result.success) {
      toast.success('Wydarzenie usunięte')
      setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id))
      setShowDrawer(false)
    } else {
      toast.error(result.error)
    }
  }

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : []

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#ececf1] bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-[#8b9098]" />
          <h1 className="text-[18px] font-medium text-[#111111]">Kalendarz</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#e7e8ee] text-[#656b76] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-[14px] font-semibold text-[#111111]">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#e7e8ee] text-[#656b76] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="ml-2 inline-flex h-8 items-center rounded-[6px] border border-[#e7e8ee] bg-white px-3 text-[12px] font-medium text-[#656b76] transition-colors hover:bg-[#f7f7f9] hover:text-[#111111]"
          >
            Dzisiaj
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => openNewEvent()}
              className="ml-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[#111111] px-3 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
            >
              <Plus className="h-3.5 w-3.5" />
              Nowe wydarzenie
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[260px] flex-col border-r border-[#ececf1] bg-[#fafafa]">
          <div className="border-b border-[#ececf1] p-4">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#8b9098]">
              Nadchodzące
            </h2>
            {upcomingEvents.length === 0 && (
              <p className="text-[12px] text-[#8b9098]">Brak nadchodzących wydarzeń</p>
            )}
            <div className="space-y-2">
              {upcomingEvents.map((event) => {
                const meta = CATEGORY_META[event.category] || CATEGORY_META[DEFAULT_CATEGORY]
                return (
                  <button
                    key={event.id}
                    onClick={() => openEditEvent(event)}
                    className="flex w-full items-start gap-2 rounded-[6px] bg-white p-2 text-left shadow-sm ring-1 ring-[#e7e8ee] transition-all hover:ring-[#d7d9e2]"
                  >
                    <div
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color || meta.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-[#111111]">{event.title}</p>
                      <p className="text-[11px] text-[#8b9098]">
                        {new Date(event.start_at).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {event.all_day
                          ? ''
                          : `, ${new Date(event.start_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[12px] font-semibold text-[#111111]">
                  {isSameDay(selectedDate, today)
                    ? 'Dzisiaj'
                    : selectedDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <span className="text-[11px] text-[#8b9098]">{selectedDayEvents.length} wydarzeń</span>
              </div>
              <div className="space-y-2">
                {selectedDayEvents.length === 0 && (
                  <p className="text-[12px] text-[#8b9098]">Brak wydarzeń tego dnia</p>
                )}
                {selectedDayEvents.map((event) => {
                  const meta = CATEGORY_META[event.category] || CATEGORY_META[DEFAULT_CATEGORY]
                  return (
                    <button
                      key={event.id}
                      onClick={() => openEditEvent(event)}
                      className="flex w-full items-start gap-2 rounded-[6px] border-l-[3px] bg-white p-2.5 text-left shadow-sm ring-1 ring-[#e7e8ee] transition-all hover:ring-[#d7d9e2]"
                      style={{ borderLeftColor: event.color || meta.color }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[#111111]">{event.title}</p>
                        {event.description && (
                          <p className="mt-0.5 truncate text-[11px] text-[#8b9098]">{event.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                          {!event.all_day && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#8b9098]">
                              <Clock className="h-3 w-3" />
                              {new Date(event.start_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                              {event.end_at && (
                                <>
                                  {' '}-{' '}
                                  {new Date(event.end_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="grid grid-cols-7 border-b border-[#ececf1]">
            {weekDaysShort.map((day, i) => (
              <div
                key={day}
                className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8b9098]"
              >
                <span className="hidden lg:inline">{weekDays[i]}</span>
                <span className="lg:hidden">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 auto-rows-fr overflow-auto">
            {days.map((date, index) => {
              const isCurrentMonth = date.getMonth() === month
              const _isToday = isSameDay(date, today)
              const dayEvents = getEventsForDate(date)
              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  className={`group relative flex flex-col border-b border-r border-[#ececf1] p-2 text-left transition-colors hover:bg-[#fafafa] ${
                    !isCurrentMonth ? 'bg-[#fbfbfc]' : 'bg-white'
                  } ${isSelected ? 'bg-[#fafafa] ring-1 ring-inset ring-[#111111]' : ''}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium ${
                        _isToday
                          ? 'bg-[#111111] text-white'
                          : isCurrentMonth
                            ? 'text-[#111111] group-hover:bg-[#f0f0f4]'
                            : 'text-[#b0b4bb]'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-medium text-[#8b9098]">{dayEvents.length}</span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 4).map((event) => {
                      const meta = CATEGORY_META[event.category] || CATEGORY_META[DEFAULT_CATEGORY]
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditEvent(event)
                          }}
                          className="flex items-center gap-1.5 rounded-[4px] px-2 py-1 transition-transform hover:scale-[1.02]"
                          style={{
                            backgroundColor: meta.bg,
                            borderLeft: `3px solid ${event.color || meta.color}`,
                          }}
                        >
                          <span className="truncate text-[11px] font-medium" style={{ color: meta.color }}>
                            {event.title}
                          </span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 4 && (
                      <span className="px-1 text-[10px] font-medium text-[#8b9098]">
                        +{dayEvents.length - 4} więcej
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </main>
      </div>

      {showDrawer && canManage && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDrawer(false)} />
          <div className="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ececf1] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#111111]">
                  {editingEvent ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#8b9098]">
                  {selectedDate?.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="rounded-[6px] p-1.5 text-[#8b9098] transition-colors hover:bg-[#f0f0f4] hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={handleSave} className="flex flex-1 flex-col overflow-auto">
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#111111]">Tytuł</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingEvent?.title ?? ''}
                    placeholder="Np. Spotkanie z klientem"
                    className="h-10 w-full rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#b0b4bb] focus:border-[#d7d9e2] focus:bg-white"
                    required
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-4 w-4 rounded border-[#e7e8ee] text-[#111111]"
                  />
                  <span className="text-[13px] text-[#555b66]">Cały dzień</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#111111]">Start</label>
                    {allDay ? (
                      <input
                        type="date"
                        name="start_at"
                        defaultValue={
                          editingEvent
                            ? formatDateOnlyInput(new Date(editingEvent.start_at))
                            : selectedDate
                              ? formatDateOnlyInput(selectedDate)
                              : ''
                        }
                        className="h-10 w-full rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors focus:border-[#d7d9e2] focus:bg-white"
                        required
                      />
                    ) : (
                      <input
                        type="datetime-local"
                        name="start_at"
                        defaultValue={
                          editingEvent
                            ? formatDateInput(new Date(editingEvent.start_at))
                            : selectedDate
                              ? formatDateInput(selectedDate)
                              : ''
                        }
                        className="h-10 w-full rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors focus:border-[#d7d9e2] focus:bg-white"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#111111]">Koniec</label>
                    {allDay ? (
                      <input
                        type="date"
                        name="end_at"
                        defaultValue={
                          editingEvent?.end_at ? formatDateOnlyInput(new Date(editingEvent.end_at)) : ''
                        }
                        className="h-10 w-full rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors focus:border-[#d7d9e2] focus:bg-white"
                      />
                    ) : (
                      <input
                        type="datetime-local"
                        name="end_at"
                        defaultValue={
                          editingEvent?.end_at ? formatDateInput(new Date(editingEvent.end_at)) : ''
                        }
                        className="h-10 w-full rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 text-[13px] text-[#111111] outline-none transition-colors focus:border-[#d7d9e2] focus:bg-white"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#111111]">Kategoria</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                      const meta = CATEGORY_META[cat]
                      return (
                        <label
                          key={cat}
                          className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all"
                          style={{
                            borderColor: meta.border,
                            backgroundColor: meta.bg,
                            color: meta.color,
                          }}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={cat}
                            defaultChecked={(editingEvent?.category ?? DEFAULT_CATEGORY) === cat}
                            className="sr-only"
                          />
                          {meta.label}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#111111]">Kolor</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <label key={c} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="color"
                          value={c}
                          defaultChecked={
                            (editingEvent?.color ?? CATEGORY_META[editingEvent?.category ?? DEFAULT_CATEGORY].color) === c
                          }
                          className="sr-only"
                        />
                        <span
                          className="inline-block h-7 w-7 rounded-full ring-2 ring-offset-1 transition-all hover:scale-110 peer-checked:ring-[#111111]"
                          style={{ backgroundColor: c }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#111111]">
                    <AlignLeft className="h-3.5 w-3.5" />
                    Opis
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingEvent?.description ?? ''}
                    placeholder="Opcjonalny opis wydarzenia"
                    rows={3}
                    className="w-full resize-none rounded-[6px] border border-[#e7e8ee] bg-[#fbfbfc] px-3 py-2 text-[13px] text-[#111111] outline-none transition-colors placeholder:text-[#b0b4bb] focus:border-[#d7d9e2] focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-[#ececf1] px-5 py-4">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Usuń
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDrawer(false)}
                    className="inline-flex h-9 items-center rounded-[6px] border border-[#e7e8ee] bg-white px-4 text-[12px] font-medium text-[#656b76] transition-colors hover:bg-[#f7f7f9]"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[#111111] px-4 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#262626]"
                  >
                    {editingEvent ? 'Zapisz zmiany' : 'Utwórz wydarzenie'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
