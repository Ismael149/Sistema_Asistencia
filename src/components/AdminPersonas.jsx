import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, User, Phone, MapPin, Building, ShieldCheck } from 'lucide-react';

export default function AdminPersonas({
  personas,
  comunas,
  comisiones,
  onAddPersona,
  onUpdatePersona,
  onDeletePersona,
  onViewPersonDetail
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedComision, setSelectedComision] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [formData, setFormData] = useState({
    cedula: '',
    nombre_apellido: '',
    municipio: 'BOLIVAR',
    comuna: '',
    comision: '',
    telefono: ''
  });

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleOpenAdd = () => {
    setEditingPersona(null);
    setFormData({
      cedula: '',
      nombre_apellido: '',
      municipio: 'BOLIVAR',
      comuna: comunas[0] || 'ANTONIO RICAURTE',
      comision: comisiones[0] || 'ORGANIZACIÓN',
      telefono: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p, e) => {
    e.stopPropagation();
    setEditingPersona(p);
    setFormData({
      cedula: p.cedula,
      nombre_apellido: p.nombre_apellido,
      municipio: p.municipio || 'BOLIVAR',
      comuna: p.comuna || '',
      comision: p.comision || '',
      telefono: p.telefono || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPersona) {
      onUpdatePersona(editingPersona.id, formData);
    } else {
      onAddPersona(formData);
    }
    setIsModalOpen(false);
  };

  const filteredPersonas = personas.filter(p => {
    const matchesSearch = !searchQuery ||
      p.nombre_apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cedula.includes(searchQuery) ||
      (p.comuna && p.comuna.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesComuna = !selectedComuna || p.comuna === selectedComuna;
    const matchesComision = !selectedComision || p.comision === selectedComision;

    return matchesSearch && matchesComuna && matchesComision;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 sm:p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-400" />
            Administración de Personas (Lista de Asistencia)
          </h1>
          <p className="text-sm text-slate-400">Panel exclusivo para administradores: agregar, editar y eliminar integrantes.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-950/40 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Agregar Persona</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-col gap-3">
          
          {/* Row 1: Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cédula, nombre o comuna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-sm"
            />
          </div>

          {/* Row 2: Dropdowns + Stats */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            
            {/* Dropdowns — grid on mobile, auto on desktop */}
            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
              <select
                value={selectedComuna}
                onChange={(e) => setSelectedComuna(e.target.value)}
                className="glass-input px-2 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border-slate-700 w-full sm:w-auto"
              >
                <option value="">Todas las Comunas ({comunas.length})</option>
                {comunas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={selectedComision}
                onChange={(e) => setSelectedComision(e.target.value)}
                className="glass-input px-2 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border-slate-700 w-full sm:w-auto"
              >
                <option value="">Todas las Comisiones</option>
                {comisiones.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="text-xs text-slate-400 font-semibold mt-2 sm:mt-0 whitespace-nowrap">
              Mostrando <span className="text-amber-400 font-bold">{filteredPersonas.length}</span> de {personas.length} integrantes
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Cédula</th>
                <th className="px-4 py-3.5">Nombre y Apellido</th>
                <th className="px-4 py-3.5">Municipio</th>
                <th className="px-4 py-3.5">Comuna</th>
                <th className="px-4 py-3.5">Comisión</th>
                <th className="px-4 py-3.5">Teléfono</th>
                <th className="px-4 py-3.5 text-center">Acciones (Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPersonas.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => onViewPersonDetail(p.id)}
                  className={`transition-colors hover:bg-slate-800/60 cursor-pointer ${
                    idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-transparent'
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-amber-400">
                    {p.cedula}
                  </td>
                  <td className="px-4 py-3 font-bold text-white hover:text-rose-400">
                    {p.nombre_apellido}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.municipio || 'BOLIVAR'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {p.comuna || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.comision || '-'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">
                    {p.telefono || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => handleOpenEdit(p, e)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                        title="Editar persona"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(p.id);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                        title="Eliminar persona"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl space-y-4 border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-400" />
              {editingPersona ? 'Editar Integrante' : 'Agregar Nuevo Integrante'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cédula *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 12345678"
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: JUAN PEREZ"
                  value={formData.nombre_apellido}
                  onChange={(e) => setFormData({ ...formData, nombre_apellido: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-sm uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Comuna</label>
                <select
                  value={formData.comuna}
                  onChange={(e) => setFormData({ ...formData, comuna: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-sm uppercase bg-slate-900 text-slate-200 border-slate-700"
                >
                  <option value="">Seleccione una Comuna</option>
                  {comunas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Comisión</label>
                <select
                  value={formData.comision}
                  onChange={(e) => setFormData({ ...formData, comision: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-sm uppercase bg-slate-900 text-slate-200 border-slate-700"
                >
                  <option value="">Seleccione una Comisión</option>
                  {comisiones.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej: 04121234567"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full glass-input px-3 py-2 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl"
                >
                  {editingPersona ? 'Guardar Cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl space-y-4 border border-rose-900/50 text-center">
            <Trash2 className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">¿Confirmar Eliminación?</h3>
            <p className="text-xs text-slate-300">
              Esta acción eliminará permanentemente la persona y sus registros asociados del sistema.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeletePersona(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
