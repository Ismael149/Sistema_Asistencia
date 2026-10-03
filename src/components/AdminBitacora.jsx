import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Clock, User, Activity, RefreshCw } from 'lucide-react';

export default function AdminBitacora() {
  const [logs, setLogs] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccion, setSelectedAccion] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    let url = `/api/bitacora?q=${encodeURIComponent(searchQuery)}`;
    if (selectedAccion) url += `&accion=${encodeURIComponent(selectedAccion)}`;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.logs) {
          setLogs(data.logs);
          if (data.acciones) setAcciones(data.acciones);
        }
      })
      .catch(err => {
        setLoading(false);
        console.error('Error al cargar la bitácora:', err);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAccion]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadgeStyle = (accion) => {
    switch (accion) {
      case 'INICIO_SESION':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'CIERRE_SESION':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'TOMAR_ASISTENCIA':
        return 'bg-rose-950 text-rose-300 border-rose-900';
      case 'CREAR_PERSONA':
      case 'CREAR_EVENTO':
        return 'bg-amber-950 text-amber-300 border-amber-900';
      case 'EDITAR_PERSONA':
      case 'EDITAR_EVENTO':
        return 'bg-cyan-950 text-cyan-300 border-cyan-900';
      case 'ELIMINAR_PERSONA':
      case 'ELIMINAR_EVENTO':
        return 'bg-red-950 text-red-400 border-red-900';
      case 'DESCARGAR_REPORTE':
        return 'bg-purple-950 text-purple-300 border-purple-900';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-cyan-400" />
              Bitácora de Auditoría del Sistema (Solo Admin)
            </h1>
            <p className="text-sm text-slate-400">Registro histórico transparente de inicios de sesión y todas las actividades realizadas en el sistema.</p>
          </div>

          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 font-semibold text-xs transition-colors self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar Bitácora</span>
          </button>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar actividad, usuario o detalle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedAccion}
              onChange={(e) => setSelectedAccion(e.target.value)}
              className="w-full sm:w-auto glass-input px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border-slate-700"
            >
              <option value="">Todas las Acciones ({acciones.length})</option>
              {acciones.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow transition-colors"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando la bitácora de auditoría...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron registros en la bitácora con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">ID / Fecha y Hora</th>
                  <th className="px-4 py-3.5">Usuario / Rol</th>
                  <th className="px-4 py-3.5">Acción</th>
                  <th className="px-4 py-3.5">Detalle de Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      <span className="text-slate-600 font-bold mr-2">#{log.id}</span>
                      {log.fecha_hora}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{log.usuario_nombre}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          log.rol === 'admin' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {log.rol}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md font-extrabold text-[10px] border ${getActionBadgeStyle(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-200">
                      {log.detalle}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
