import React, { useState, useEffect } from 'react';
import { X, User, CheckCircle2, XCircle, Calendar, MapPin, Phone, Building, Award, Clock } from 'lucide-react';

export default function PersonDetailModal({ personaId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personaId) return;

    setLoading(true);
    fetch(`/api/personas/${personaId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    })
      .then(res => res.json())
      .then(resData => {
        setLoading(false);
        setData(resData);
      })
      .catch(err => {
        setLoading(false);
        console.error('Error al obtener historial individual:', err);
      });
  }, [personaId]);

  if (!personaId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
        
        {/* Header Modal */}
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Registro e Historial de Asistencia Individual</h2>
              <p className="text-xs text-slate-400">Detalle completo de participaciones a eventos comunales.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Cargando el expediente de asistencia...
            </div>
          ) : !data || !data.persona ? (
            <div className="py-12 text-center text-slate-500">
              No se pudo cargar la información de la persona.
            </div>
          ) : (
            <>
              {/* Persona Profile Header Info */}
              <div className="glass-card p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-white">{data.persona.nombre_apellido}</h3>
                    <p className="text-xs font-mono text-amber-400 font-bold">Cédula: C.I. {data.persona.cedula}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-rose-300 border border-slate-700">
                      Comuna: {data.persona.comuna || 'General'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 font-semibold block">Comisión:</span>
                    <span className="font-medium text-slate-200">{data.persona.comision || 'No asignada'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Municipio:</span>
                    <span className="font-medium text-slate-200">{data.persona.municipio || 'BOLIVAR'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Teléfono:</span>
                    <span className="font-mono text-slate-200">{data.persona.telefono || 'Sin teléfono'}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Eventos Convocado</span>
                  <p className="text-2xl font-black text-white mt-0.5">{data.estadisticas.totalEventosConvocado}</p>
                </div>

                <div className="glass-card p-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 text-center">
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase">Veces Asistido (Presente)</span>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">{data.estadisticas.totalAsistencias}</p>
                </div>

                <div className="glass-card p-3 rounded-xl border border-rose-900/50 bg-rose-950/20 text-center">
                  <span className="text-[11px] text-rose-400 font-semibold uppercase">Inasistencias (Ausente)</span>
                  <p className="text-2xl font-black text-rose-400 mt-0.5">{data.estadisticas.totalInasistencias}</p>
                </div>

                <div className="glass-card p-3 rounded-xl border border-cyan-900/50 bg-cyan-950/20 text-center">
                  <span className="text-[11px] text-cyan-400 font-semibold uppercase">% Tasa de Asistencia</span>
                  <p className="text-2xl font-black text-cyan-400 mt-0.5">{data.estadisticas.porcentajeAsistencia}</p>
                </div>
              </div>

              {/* History Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  Historial Detallado de Asistencia a Eventos
                </h4>

                {data.historial.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 glass-card rounded-xl border border-slate-800">
                    No hay listas de asistencia donde se haya incluido a esta persona todavía.
                  </div>
                ) : (
                  <div className="glass-card rounded-xl overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/90 font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Fecha y Hora Lista</th>
                            <th className="px-4 py-3">Evento</th>
                            <th className="px-4 py-3">Categoría</th>
                            <th className="px-4 py-3">Lugar</th>
                            <th className="px-4 py-3 text-center">Asistencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {data.historial.map((h) => (
                            <tr key={h.detalle_id} className="hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-mono text-slate-400">
                                {h.fecha_guardado} {h.hora_guardado.substring(0, 5)}
                              </td>

                              <td className="px-4 py-3 font-bold text-white">
                                {h.evento_titulo}
                              </td>

                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-rose-300 border border-slate-700">
                                  {h.evento_categoria || 'General'}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-slate-400">
                                {h.evento_lugar || '-'}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {h.asistio === 1 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> PRESENTE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-rose-950 text-rose-300 border border-rose-900">
                                    <XCircle className="w-3.5 h-3.5" /> AUSENTE
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
