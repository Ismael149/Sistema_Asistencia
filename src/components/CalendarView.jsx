import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, MapPin, Clock, CheckSquare, Edit, Trash2, Tag, ChevronDown } from 'lucide-react';

export default function CalendarView({ eventos, onSelectEventoForAsistencia, onOpenNewEventModal, onEditEvent, onDeleteEvent, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  // On mobile, toggle between calendar and event panel view
  const [mobileView, setMobileView] = useState('calendar'); // 'calendar' | 'events'

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const eventsByDate = {};
  eventos.forEach(ev => {
    if (!eventsByDate[ev.fecha]) eventsByDate[ev.fecha] = [];
    eventsByDate[ev.fecha].push(ev);
  });

  const getFormattedDayString = (dayNum) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleDayClick = (dayNum) => {
    const dateStr = getFormattedDayString(dayNum);
    setSelectedDateStr(dateStr);
    setSelectedDayEvents(eventsByDate[dateStr] || []);
    // On mobile, auto-switch to events panel when a day is clicked
    setMobileView('events');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 glass-panel p-4 sm:p-6 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500" />
            Calendario de Eventos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Asigna eventos por fecha y toma la asistencia.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Month Navigator */}
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button onClick={handlePrevMonth} className="p-1.5 sm:p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="px-2 sm:px-4 text-xs sm:text-sm font-semibold text-white min-w-[110px] sm:min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 sm:p-2 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
          >
            Hoy
          </button>

          <button
            onClick={() => onOpenNewEventModal(selectedDateStr || todayStr)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-950/40 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Nuevo Evento</span>
            <span className="xs:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* ── Mobile view toggle ── */}
      <div className="flex lg:hidden bg-slate-900/80 p-1 rounded-xl border border-slate-800 gap-1">
        <button
          onClick={() => setMobileView('calendar')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileView === 'calendar' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setMobileView('events')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileView === 'events' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          📋 Eventos del Día {selectedDayEvents.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full">{selectedDayEvents.length}</span>}
        </button>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Calendar Grid */}
        <div className={`lg:col-span-2 glass-panel p-3 sm:p-6 rounded-2xl space-y-3 ${mobileView === 'events' ? 'hidden lg:block' : 'block'}`}>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center font-bold text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            <div className="text-rose-400">Dom</div>
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div className="text-rose-400">Sáb</div>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-2">

            {/* Empty slots */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[48px] sm:min-h-[90px] rounded-lg sm:rounded-xl bg-slate-900/30 opacity-20 border border-transparent"></div>
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = getFormattedDayString(dayNum);
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(dayNum)}
                  className={`min-h-[48px] sm:min-h-[90px] p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/50'
                      : isToday
                      ? 'bg-slate-800/80 border-rose-500/50 hover:bg-slate-800'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between">
                    <span className={`text-[11px] sm:text-sm font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0 ${
                      isToday ? 'bg-rose-600 text-white font-extrabold' : 'text-slate-300'
                    }`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full bg-slate-800 text-rose-400 border border-rose-900/40">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event badges — hidden on very small screens to keep cells compact */}
                  <div className="space-y-0.5 mt-0.5 overflow-hidden max-h-[36px] sm:max-h-[50px] hidden sm:block">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded font-medium truncate flex items-center gap-1 ${
                          ev.tiene_asistencia
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                            : 'bg-rose-950/60 text-rose-200 border border-rose-900/40'
                        }`}
                      >
                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full flex-shrink-0 ${ev.tiene_asistencia ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className="truncate">{ev.titulo}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-slate-400 text-center font-semibold">+{dayEvents.length - 2} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Details Panel */}
        <div className={`glass-panel p-4 sm:p-6 rounded-2xl space-y-4 flex flex-col ${mobileView === 'calendar' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Eventos del Día</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {selectedDateStr ? `📅 ${selectedDateStr}` : 'Selecciona un día'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Back to calendar on mobile */}
              <button
                onClick={() => setMobileView('calendar')}
                className="lg:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs border border-slate-700 transition-colors"
                title="Volver al calendario"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {selectedDateStr && (
                <button
                  onClick={() => onOpenNewEventModal(selectedDateStr)}
                  className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                  title="Agregar evento en este día"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px] sm:max-h-[500px] space-y-3 pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 space-y-2">
                <CalendarIcon className="w-10 h-10 mx-auto stroke-1 opacity-50 text-slate-600" />
                <p className="text-sm">
                  {selectedDateStr ? 'No hay eventos para este día.' : 'Selecciona un día en el calendario.'}
                </p>
                {selectedDateStr && (
                  <button
                    onClick={() => onOpenNewEventModal(selectedDateStr)}
                    className="text-xs font-semibold text-rose-400 hover:underline inline-block mt-1"
                  >
                    + Asignar Evento
                  </button>
                )}
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
                <div key={ev.id} className="glass-card p-3 sm:p-4 rounded-xl space-y-3 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-900/50">
                        {ev.categoria || 'General'}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-1 break-words">{ev.titulo}</h3>
                    </div>
                    {user?.rol === 'admin' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onEditEvent(ev)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar evento"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {ev.descripcion && <p className="text-xs text-slate-300 line-clamp-2">{ev.descripcion}</p>}

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <span>{ev.hora_inicio || '09:00'} - {ev.hora_fin || '12:00'}</span>
                    </div>
                    {ev.lugar && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <span className="break-words">{ev.lugar}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      {ev.tiene_asistencia ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5" />
                          {ev.totalAsistentes} / {ev.totalRegistrados} presentes
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-medium">⚠️ Sin lista</span>
                      )}
                    </div>
                    <button
                      onClick={() => onSelectEventoForAsistencia(ev)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg shadow transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{ev.tiene_asistencia ? 'Ver / Modificar' : 'Tomar Asistencia'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
