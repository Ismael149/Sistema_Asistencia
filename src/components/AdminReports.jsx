import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, FileText, Download, Calendar,
  RefreshCw, Users, UserCheck, UserX, TrendingUp,
  Clock, MapPin, Tag, FolderOpen, ChevronDown
} from 'lucide-react';

export default function AdminReports() {
  const [reportType, setReportType] = useState('diario');
  // Para diario y semanal se usa una fecha, para mensual se usa YYYY-MM
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.substring(0, 7);

  const [fechaRef, setFechaRef] = useState(todayStr);
  const [mesRef, setMesRef] = useState(currentMonth);

  const [listas, setListas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);

  // Convierte mesRef (YYYY-MM) a la última fecha del mes para el query
  const getEffectiveFechaRef = () => {
    if (reportType === 'mensual') {
      // Usamos el último día del mes seleccionado como fecha de referencia
      const [y, m] = mesRef.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      return `${mesRef}-${String(lastDay).padStart(2, '0')}`;
    }
    return fechaRef;
  };

  const fetchListas = () => {
    setLoading(true);
    const token = localStorage.getItem('token') || '';
    const effectiveFecha = getEffectiveFechaRef();
    const url = `/api/reportes/listas?tipo=${reportType}&fecha=${effectiveFecha}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        setListas(data.listas || []);
        setResumen(data.resumen || null);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchListas(); }, [reportType, fechaRef, mesRef]);

  // ── Descarga individual de una lista (Excel o PDF) ──────────────────
  const downloadFile = (format, listaId, nombreLista, fechaGuardado) => {
    const token = localStorage.getItem('token') || '';
    const url = `/api/reportes/${format}?lista_id=${listaId}&fecha=${fechaGuardado}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Error en la respuesta del servidor');
        return r.blob();
      })
      .then(blob => {
        const href = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        // Nombre seguro: sin acentos ni caracteres especiales
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        a.download = `Lista_Asistencia_${listaId}_${fechaGuardado}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(href);
      })
      .catch(err => console.error('Error descargando:', err));
  };

  // ── Descarga consolidada de todo el período ──────────────────────────
  const downloadPeriod = (format) => {
    const token = localStorage.getItem('token') || '';
    const effectiveFecha = getEffectiveFechaRef();
    const url = `/api/reportes/${format}?tipo=${reportType}&fecha=${effectiveFecha}`;
    const ext = format === 'excel' ? 'xlsx' : 'pdf';

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Error en la respuesta del servidor');
        return r.blob();
      })
      .then(blob => {
        const href = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `Reporte_${reportType.toUpperCase()}_${effectiveFecha}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(href);
      })
      .catch(err => console.error('Error descargando período:', err));
  };

  const getCategoryColor = (cat) => {
    switch ((cat || '').toLowerCase()) {
      case 'asamblea':    return 'bg-rose-950/60 text-rose-300 border-rose-900/50';
      case 'formación':
      case 'formacion':   return 'bg-amber-950/60 text-amber-300 border-amber-900/50';
      case 'electoral':   return 'bg-cyan-950/60 text-cyan-300 border-cyan-900/50';
      case 'jornada':     return 'bg-purple-950/60 text-purple-300 border-purple-900/50';
      default:            return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const porcentajeNum = resumen
    ? parseFloat(resumen.porcentajeAsistencia)
    : 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
              Reportes de Asistencia
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-400 border border-amber-900/60 ml-1">
                Solo Administrador
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Consulta y descarga las listas de asistencia guardadas por período en formato Excel (.xlsx) o PDF.
            </p>
          </div>

          {/* Period tabs */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl gap-1 self-start md:self-auto">
            {[
              { key: 'diario',   label: '📅 Diario' },
              { key: 'semanal',  label: '📆 Semanal' },
              { key: 'mensual',  label: '🗓️ Mensual' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setReportType(t.key)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  reportType === t.key
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date selectors */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {reportType !== 'mensual' ? (
              <>
                <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                  {reportType === 'diario' ? 'Día:' : 'Semana hasta:'}
                </label>
                <input
                  type="date"
                  value={fechaRef}
                  onChange={e => setFechaRef(e.target.value)}
                  className="glass-input px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white border-slate-700"
                />
              </>
            ) : (
              <>
                <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Mes:</label>
                <input
                  type="month"
                  value={mesRef}
                  onChange={e => setMesRef(e.target.value)}
                  className="glass-input px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white border-slate-700"
                />
              </>
            )}
            <button
              onClick={fetchListas}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Download full-period buttons (only if there are lists) */}
          {listas.length > 0 && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-xs text-slate-500 hidden sm:inline">Descargar período completo:</span>
              <button
                onClick={() => downloadPeriod('excel')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all hover:scale-105 shadow shadow-emerald-950/50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
              <button
                onClick={() => downloadPeriod('pdf')}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all hover:scale-105 shadow shadow-rose-950/50"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
            <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Total Convocados</span>
            <p className="text-3xl font-black text-white mt-1">{resumen.totalRegistros}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 text-center">
            <UserCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">Asistentes</span>
            <p className="text-3xl font-black text-emerald-400 mt-1">{resumen.totalAsistentes}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-rose-900/50 bg-rose-950/20 text-center">
            <UserX className="w-5 h-5 text-rose-400 mx-auto mb-1" />
            <span className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider block">Ausentes</span>
            <p className="text-3xl font-black text-rose-400 mt-1">{resumen.totalAusentes}</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-cyan-900/50 bg-cyan-950/20 text-center">
            <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <span className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider block">% Efectividad</span>
            <p className="text-3xl font-black text-cyan-400 mt-1">{resumen.porcentajeAsistencia}</p>
          </div>
        </div>
      )}

      {/* ── File List Cards ── */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Listas Guardadas —{' '}
              <span className="text-emerald-400">
                {reportType === 'diario' ? `Día ${fechaRef}`
                  : reportType === 'semanal' ? `Semana hasta ${fechaRef}`
                  : `Mes ${mesRef}`}
              </span>
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {listas.length} {listas.length === 1 ? 'archivo' : 'archivos'}
          </span>
        </div>

        {loading ? (
          <div className="p-14 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm">Buscando listas del período...</p>
          </div>
        ) : listas.length === 0 ? (
          <div className="p-14 text-center text-slate-500 space-y-3">
            <FolderOpen className="w-14 h-14 mx-auto stroke-1 opacity-30" />
            <div>
              <p className="text-sm font-semibold">No hay listas de asistencia guardadas para este período.</p>
              <p className="text-xs text-slate-600 mt-1">
                Las listas aparecerán aquí una vez que se tome y guarde la asistencia de un evento.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {listas.map(lista => {
              const pct = lista.total_personas > 0
                ? Math.round((lista.total_presentes / lista.total_personas) * 100)
                : 0;

              return (
                <div
                  key={lista.id}
                  className="p-4 sm:p-5 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                    {/* File icon accent */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Title row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryColor(lista.evento_categoria)}`}>
                          {lista.evento_categoria || 'General'}
                        </span>
                        <h3 className="text-sm font-bold text-white truncate">
                          {lista.nombre_lista}
                        </h3>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-rose-400" />
                          {lista.fecha_guardado}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          {lista.hora_guardado}
                        </span>
                        {lista.evento_lugar && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            {lista.evento_lugar}
                          </span>
                        )}
                        <span className="text-slate-500">
                          Registrado por: <span className="text-slate-300 font-medium">{lista.tomado_por || 'Sistema'}</span>
                        </span>
                      </div>

                      {/* Attendance mini-bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400 whitespace-nowrap">
                          {lista.total_presentes}/{lista.total_personas} ({pct}%)
                        </span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap hidden sm:inline">
                          {lista.total_ausentes} ausentes
                        </span>
                      </div>
                    </div>

                    {/* Download buttons */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => downloadFile('excel', lista.id, lista.nombre_lista, lista.fecha_guardado)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all hover:scale-105 shadow shadow-emerald-950/40"
                        title="Descargar como Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>.XLSX</span>
                      </button>
                      <button
                        onClick={() => downloadFile('pdf', lista.id, lista.nombre_lista, lista.fecha_guardado)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-700/80 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all hover:scale-105 shadow shadow-rose-950/40"
                        title="Descargar como PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>.PDF</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
