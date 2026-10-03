import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, Clock, MapPin, Tag } from 'lucide-react';

export default function EventModal({ eventToEdit, initialDate, onClose, onSave }) {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    lugar: '',
    fecha: initialDate || new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '12:00',
    categoria: 'Asamblea',
    estado: 'programado'
  });

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        titulo: eventToEdit.titulo || '',
        descripcion: eventToEdit.descripcion || '',
        lugar: eventToEdit.lugar || '',
        fecha: eventToEdit.fecha || initialDate || '',
        hora_inicio: eventToEdit.hora_inicio || '09:00',
        hora_fin: eventToEdit.hora_fin || '12:00',
        categoria: eventToEdit.categoria || 'Asamblea',
        estado: eventToEdit.estado || 'programado'
      });
    }
  }, [eventToEdit, initialDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo || !formData.fecha) return;
    onSave(formData, eventToEdit ? eventToEdit.id : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl space-y-4 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-rose-500" />
            {eventToEdit ? 'Editar Evento en Calendario' : 'Asignar Nuevo Evento al Calendario'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Evento *</label>
            <input
              type="text"
              required
              placeholder="Ej: Asamblea de Voceros Comunales"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm bg-slate-900 border-slate-700"
              >
                <option value="Asamblea">Asamblea General</option>
                <option value="Formación">Formación Política</option>
                <option value="Electoral">Despliegue Electoral</option>
                <option value="Jornada">Jornada Social</option>
                <option value="General">General / Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hora Inicio</label>
              <input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hora Fin</label>
              <input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Lugar del Evento</label>
            <input
              type="text"
              placeholder="Ej: Cancha de San Mateo / Casa Comunal"
              value={formData.lugar}
              onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción / Objetivos</label>
            <textarea
              rows={3}
              placeholder="Detalles sobre los temas a tratar en la asamblea..."
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/50 transition-all"
            >
              {eventToEdit ? 'Guardar Cambios' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
