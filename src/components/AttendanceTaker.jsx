import React, { useState, useEffect } from 'react';
import { CheckSquare, Search, Filter, Save, User, Calendar, MapPin, Clock, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export default function AttendanceTaker({
  selectedEvento,
  eventos,
  onSelectEvento,
  onSaveAsistencia,
  onViewPersonDetail,
  saving
}) {
  const [personas, setPersonas] = useState([]);
  const [asistenciaState, setAsistenciaState] = useState({}); // { [personaId]: boolean }
  const [observacionesState, setObservacionesState] = useState({}); // { [personaId]: string }
  const [generalObservaciones, setGeneralObservaciones] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedComision, setSelectedComision] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSavedInfo, setLastSavedInfo] = useState(null);

  // Cargar personas y estado de asistencia del evento seleccionado
  useEffect(() => {
    if (!selectedEvento) return;

    setLoading(true);
    fetch(`/api/asistencias/evento/${selectedEvento.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.personas) {
          setPersonas(data.personas);
          const initialMap = {};
          const initialObs = {};
          data.personas.forEach(p => {
            initialMap[p.id] = !!p.asistio;
            initialObs[p.id] = p.observacion || '';
          });
          setAsistenciaState(initialMap);
          setObservacionesState(initialObs);
          if (data.ultimaLista) {
            setLastSavedInfo(data.ultimaLista);
            setGeneralObservaciones(data.ultimaLista.observaciones || '');
          } else {
            setLastSavedInfo(null);
            setGeneralObservaciones('');
          }
        }
      })
      .catch(err => {
        setLoading(false);
        console.error('Error al cargar datos de asistencia:', err);
      });
  }, [selectedEvento]);

  const handleToggleCheck = (personaId) => {
    setAsistenciaState(prev => ({
      ...prev,
      [personaId]: !prev[personaId]
    }));
  };

  const handleSelectAll = (val) => {
    const updated = {};
    filteredPersonas.forEach(p => {
      updated[p.id] = val;
    });
    setAsistenciaState(prev => ({ ...prev, ...updated }));
  };

  // Filtrar personas según búsqueda y dropdowns
  const filteredPersonas = personas.filter(p => {
    const matchesSearch = !searchQuery || 
      p.nombre_apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cedula.includes(searchQuery) ||
      (p.comuna && p.comuna.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesComuna = !selectedComuna || p.comuna === selectedComuna;
    const matchesComision = !selectedComision || p.comision === selectedComision;

    return matchesSearch && matchesComuna && matchesComision;
  });

  const handleSave = () => {
    if (!selectedEvento) return;

    const asistenciasPayload = filteredPersonas.map(p => {
      return {
        persona_id: p.id,
        asistio: !!asistenciaState[p.id],
        observacion: observacionesState[p.id] || ''
      };
    });

    onSaveAsistencia({
      evento_id: selectedEvento.id,
      asistencias: asistenciasPayload,
      observaciones: generalObservaciones
    });
  };



  // Lista de comunas y comisiones únicas para los select
  const comunasUnicas = Array.from(new Set(personas.map(p => p.comuna).filter(Boolean))).sort();
  const comisionesUnicas = Array.from(new Set(personas.map(p => p.comision).filter(Boolean))).sort();

  // Métricas rápidas
  const totalInList = filteredPersonas.length;
  const totalAsistentes = filteredPersonas.filter(p => asistenciaState[p.id]).length;
  const totalAusentes = totalInList - totalAsistentes;
  const porcentaje = totalInList > 0 ? ((totalAsistentes / totalInList) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6 pb-24">

      {/* Header Selector de Evento */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-7 h-7 text-rose-500" />
              Tomar Asistencia al Evento
            </h1>
            <p className="text-sm text-slate-400">Selecciona el evento, marca los asistentes con el check y guarda la lista.</p>
          </div>

          {/* Select de Eventos */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Evento Seleccionado:
            </label>
            <select
              value={selectedEvento ? selectedEvento.id : ''}
              onChange={(e) => {
                const ev = eventos.find(item => item.id === parseInt(e.target.value, 10));
                onSelectEvento(ev);
              }}
              className="w-full glass-input px-3 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer bg-slate-900 border-slate-700"
            >
              <option value="" disabled>-- Selecciona un evento --</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.fecha} | {ev.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner de Info del Evento */}
        {selectedEvento ? (
          <div className="glass-card p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-rose-950/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rose-950 text-rose-300 border border-rose-900/60">
                  {selectedEvento.categoria || 'General'}
                </span>
                <h2 className="text-lg font-bold text-white">{selectedEvento.titulo}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-rose-400" /> {selectedEvento.fecha}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-rose-400" /> {selectedEvento.hora_inicio} - {selectedEvento.hora_fin}</span>
                {selectedEvento.lugar && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {selectedEvento.lugar}</span>}
              </div>
            </div>

            {lastSavedInfo && (
              <div className="text-xs bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 text-slate-300 space-y-0.5">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lista Guardada Previamente
                </span>
                <p className="text-[11px] text-slate-400">
                  Guardado por: <span className="text-white font-medium">{lastSavedInfo.usuario_nombre || 'Sistema'}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Fecha: <span className="text-white font-medium">{lastSavedInfo.fecha_guardado}</span> Hora: <span className="text-white font-medium">{lastSavedInfo.hora_guardado}</span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-amber-400 bg-amber-950/20 rounded-xl border border-amber-900/40">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="font-semibold text-sm">Por favor selecciona un evento del menú desplegable para tomar asistencia.</p>
          </div>
        )}
      </div>

      {selectedEvento && (
        <>
          {/* Controls: Search, Filters, Quick Actions, Counters */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
            
            {/* Stat Cards Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Lista</span>
                <p className="text-2xl font-extrabold text-white mt-1">{totalInList}</p>
              </div>
              <div className="glass-card p-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 text-center">
                <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Asistentes (Check)</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{totalAsistentes}</p>
              </div>
              <div className="glass-card p-3 rounded-xl border border-rose-900/40 bg-rose-950/20 text-center">
                <span className="text-xs text-rose-400 uppercase tracking-wider font-semibold">Ausentes</span>
                <p className="text-2xl font-extrabold text-rose-400 mt-1">{totalAusentes}</p>
              </div>
              <div className="glass-card p-3 rounded-xl border border-cyan-900/40 bg-cyan-950/20 text-center">
                <span className="text-xs text-cyan-400 uppercase tracking-wider font-semibold">% Asistencia</span>
                <p className="text-2xl font-extrabold text-cyan-400 mt-1">{porcentaje}%</p>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-3">

              {/* Row 1: Search bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar persona o cédula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-sm"
                />
              </div>

              {/* Row 2: Dropdowns + Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">

                {/* Dropdowns — full width on mobile, auto on desktop */}
                <div className="grid grid-cols-2 sm:flex gap-2 flex-1">
                  <select
                    value={selectedComuna}
                    onChange={(e) => setSelectedComuna(e.target.value)}
                    className="glass-input px-2 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border-slate-700 w-full sm:w-auto"
                  >
                    <option value="">Todas las Comunas</option>
                    {comunasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={selectedComision}
                    onChange={(e) => setSelectedComision(e.target.value)}
                    className="glass-input px-2 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border-slate-700 w-full sm:w-auto"
                  >
                    <option value="">Todas las Comisiones</option>
                    {comisionesUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 justify-end flex-shrink-0">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs rounded-lg border border-emerald-800 transition-colors"
                  >
                    ✓ Marcar Todos
                  </button>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
                  >
                    ✕ Desmarcar
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* Interactive Checkbox Attendance List Table */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Cargando lista de personas...
              </div>
            ) : filteredPersonas.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No se encontraron personas con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/90 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-16">Check</th>
                      <th className="px-4 py-3.5">Cédula</th>
                      <th className="px-4 py-3.5">Nombre y Apellido</th>
                      <th className="px-4 py-3.5">Comuna</th>
                      <th className="px-4 py-3.5">Comisión</th>
                      <th className="px-4 py-3.5">Teléfono</th>
                      <th className="px-4 py-3.5 text-center">Acción / Historial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPersonas.map((persona, index) => {
                      const isChecked = !!asistenciaState[persona.id];

                      return (
                        <tr
                          key={persona.id}
                          className={`transition-colors hover:bg-slate-800/50 ${
                            isChecked ? 'bg-emerald-950/20' : index % 2 === 0 ? 'bg-slate-900/30' : 'bg-transparent'
                          }`}
                        >
                          {/* CUADRITO DE CHECK DE ASISTENCIA */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCheck(persona.id)}
                              className="w-5 h-5 accent-rose-600 rounded cursor-pointer transition-transform transform active:scale-125"
                            />
                          </td>

                          {/* Cédula */}
                          <td className="px-4 py-3 font-mono font-medium text-slate-200">
                            {persona.cedula}
                          </td>

                          {/* Nombre y Apellido (Click para ver historial individual) */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => onViewPersonDetail(persona.id)}
                              className="font-bold text-white hover:text-rose-400 hover:underline text-left transition-colors flex items-center gap-1.5 group"
                              title="Haga clic para ver el registro e historial de asistencia de esta persona"
                            >
                              <span>{persona.nombre_apellido}</span>
                              <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* Comuna */}
                          <td className="px-4 py-3 text-xs text-slate-300">
                            <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                              {persona.comuna || 'General'}
                            </span>
                          </td>

                          {/* Comisión */}
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {persona.comision || 'N/A'}
                          </td>

                          {/* Teléfono */}
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {persona.telefono || '-'}
                          </td>

                          {/* Ver Historial Button */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => onViewPersonDetail(persona.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1"
                            >
                              <User className="w-3 h-3" />
                              Ver Historial
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* Sticky Bottom Bar with Save Button */}
          <div className="fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-slate-800 p-4 shadow-2xl backdrop-blur-xl">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-300 flex items-center gap-3">
                <span className="font-semibold">Resumen de Asistencia:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  {totalAsistentes} Presentes
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 font-bold border border-rose-900">
                  {totalAusentes} Ausentes
                </span>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-950/60 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Guardando Lista...' : 'GUARDAR LISTA DE ASISTENCIA'}</span>
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
