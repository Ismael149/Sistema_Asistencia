import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import WelcomeScreen from './components/WelcomeScreen';
import CalendarView from './components/CalendarView';
import AttendanceTaker from './components/AttendanceTaker';
import AdminPersonas from './components/AdminPersonas';
import AdminReports from './components/AdminReports';
import AdminBitacora from './components/AdminBitacora';
import PersonDetailModal from './components/PersonDetailModal';
import EventModal from './components/EventModal';
import LoginModal from './components/LoginModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'asistencia' | 'admin-personas' | 'admin-reports' | 'admin-bitacora'
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lightMode, setLightMode] = useState(() => localStorage.getItem('theme') === 'light');

  // App Data State
  const [eventos, setEventos] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [selectedEvento, setSelectedEvento] = useState(null);

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [personDetailId, setPersonDetailId] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [initialEventDate, setInitialEventDate] = useState('');

  // Toast Feedback State
  const [toast, setToast] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 0. Aplicar clase light-mode al body
  useEffect(() => {
    if (lightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [lightMode]);

  // 1. Verificación Estricta de Autenticación al Cargar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setCheckingAuth(false);
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('token');
            setUser(null);
          }
        })
        .catch(() => {
          setCheckingAuth(false);
          localStorage.removeItem('token');
          setUser(null);
        });
    } else {
      setCheckingAuth(false);
      setUser(null);
    }
  }, []);

  // 2. Cargar Eventos y Personas cuando hay usuario autenticado
  const loadEventos = () => {
    const token = localStorage.getItem('token') || '';
    fetch('/api/eventos', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.eventos) {
          setEventos(data.eventos);
          if (!selectedEvento && data.eventos.length > 0) {
            setSelectedEvento(data.eventos[0]);
          }
        }
      })
      .catch(err => console.error('Error al cargar eventos:', err));
  };

  const loadPersonas = () => {
    const token = localStorage.getItem('token') || '';
    fetch('/api/personas', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.personas) {
          setPersonas(data.personas);
          setComunas(data.comunas || []);
          setComisiones(data.comisiones || []);
        }
      })
      .catch(err => console.error('Error al cargar personas:', err));
  };

  useEffect(() => {
    if (user) {
      loadEventos();
      loadPersonas();
    }
  }, [user]);

  // Auth Handlers - Cierre de Sesión Seguro
  const handleLogout = () => {
    const token = localStorage.getItem('token');
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).finally(() => {
      localStorage.removeItem('token');
      setUser(null);
      setActiveTab('calendar');
      showToast('Sesión cerrada correctamente. Acceso bloqueado.', 'info');
    });
  };

  // Navigation from Calendar to Attendance Taking
  const handleSelectEventoForAsistencia = (ev) => {
    setSelectedEvento(ev);
    setActiveTab('asistencia');
  };

  // Event Handlers
  const handleOpenNewEvent = (dateStr) => {
    setEventToEdit(null);
    setInitialEventDate(dateStr || new Date().toISOString().split('T')[0]);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (ev) => {
    setEventToEdit(ev);
    setInitialEventDate(ev.fecha);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (formData, editId) => {
    const token = localStorage.getItem('token');
    const url = editId ? `/api/eventos/${editId}` : '/api/eventos';
    const method = editId ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.evento) {
          showToast(editId ? 'Evento actualizado correctamente' : 'Evento creado exitosamente');
          setIsEventModalOpen(false);
          loadEventos();
        } else {
          showToast(data.error || 'Error al guardar evento', 'error');
        }
      })
      .catch(() => showToast('Error de conexión', 'error'));
  };

  const handleDeleteEvent = (eventId) => {
    if (!window.confirm('¿Está seguro de eliminar este evento?')) return;
    const token = localStorage.getItem('token');
    fetch(`/api/eventos/${eventId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        showToast(data.message || 'Evento eliminado');
        loadEventos();
      })
      .catch(() => showToast('Error al eliminar evento', 'error'));
  };

  // Attendance Save Handler
  const handleSaveAsistencia = (payload) => {
    setSavingAttendance(true);
    const token = localStorage.getItem('token');

    fetch('/api/asistencias/guardar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setSavingAttendance(false);
        if (data.lista) {
          showToast(`¡Lista guardada exitosamente! ${data.lista.totalPresentes} presentes registrados el ${data.lista.fecha_guardado} a las ${data.lista.hora_guardado}.`);
          loadEventos();
        } else {
          showToast(data.error || 'Error al guardar asistencia', 'error');
        }
      })
      .catch(() => {
        setSavingAttendance(false);
        showToast('Error al conectar con el servidor', 'error');
      });
  };

  // Admin Persona CRUD Handlers
  const handleAddPersona = (formData) => {
    const token = localStorage.getItem('token');
    fetch('/api/personas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.persona) {
          showToast(`Persona "${data.persona.nombre_apellido}" agregada con éxito.`);
          loadPersonas();
        } else {
          showToast(data.error || 'Error al agregar persona', 'error');
        }
      })
      .catch(() => showToast('Error de red', 'error'));
  };

  const handleUpdatePersona = (id, formData) => {
    const token = localStorage.getItem('token');
    fetch(`/api/personas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.persona) {
          showToast(`Persona "${data.persona.nombre_apellido}" actualizada.`);
          loadPersonas();
        } else {
          showToast(data.error || 'Error al actualizar persona', 'error');
        }
      })
      .catch(() => showToast('Error de red', 'error'));
  };

  const handleDeletePersona = (id) => {
    const token = localStorage.getItem('token');
    fetch(`/api/personas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        showToast(data.message || 'Persona eliminada.');
        loadPersonas();
      })
      .catch(() => showToast('Error al eliminar', 'error'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-600 selection:text-white">
      
      {/* Toast Feedback Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
          toast.type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' :
          toast.type === 'info' ? 'bg-slate-900 text-slate-200 border-slate-700' :
          'bg-emerald-950 text-emerald-200 border-emerald-800'
        }`}>
          <span>{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Header Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        lightMode={lightMode}
        setLightMode={setLightMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {checkingAuth ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Verificando seguridad del sistema...
          </div>
        ) : !user ? (
          /* VENTANA DE BIENVENIDA CUANDO NO HAY SESIÓN INICIADA */
          <WelcomeScreen onOpenLogin={() => setIsLoginModalOpen(true)} />
        ) : (
          /* VISTAS INTERNAS DEL SISTEMA (SOLO CUANDO HAY SESIÓN INICIADA) */
          <>
            {activeTab === 'calendar' && (
              <CalendarView
                eventos={eventos}
                onSelectEventoForAsistencia={handleSelectEventoForAsistencia}
                onOpenNewEventModal={handleOpenNewEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                user={user}
              />
            )}

            {activeTab === 'asistencia' && (
              <AttendanceTaker
                selectedEvento={selectedEvento}
                eventos={eventos}
                onSelectEvento={setSelectedEvento}
                onSaveAsistencia={handleSaveAsistencia}
                onViewPersonDetail={(id) => setPersonDetailId(id)}
                saving={savingAttendance}
              />
            )}

            {activeTab === 'admin-personas' && (
              user?.rol === 'admin' ? (
                <AdminPersonas
                  personas={personas}
                  comunas={comunas}
                  comisiones={comisiones}
                  onAddPersona={handleAddPersona}
                  onUpdatePersona={handleUpdatePersona}
                  onDeletePersona={handleDeletePersona}
                  onViewPersonDetail={(id) => setPersonDetailId(id)}
                />
              ) : (
                <div className="p-12 text-center text-rose-400 glass-panel rounded-2xl">
                  ⚠️ Acceso restringido. Se requieren permisos de Administrador.
                </div>
              )
            )}

            {activeTab === 'admin-reports' && (
              user?.rol === 'admin' ? (
                <AdminReports user={user} />
              ) : (
                <div className="p-12 text-center text-rose-400 glass-panel rounded-2xl">
                  ⚠️ Acceso restringido. Se requieren permisos de Administrador.
                </div>
              )
            )}

            {activeTab === 'admin-bitacora' && (
              user?.rol === 'admin' ? (
                <AdminBitacora />
              ) : (
                <div className="p-12 text-center text-rose-400 glass-panel rounded-2xl">
                  ⚠️ Acceso restringido. Se requieren permisos de Administrador.
                </div>
              )
            )}
          </>
        )}

      </main>

      {/* Individual Attendance Profile Modal */}
      {personDetailId && (
        <PersonDetailModal
          personaId={personDetailId}
          onClose={() => setPersonDetailId(null)}
        />
      )}

      {/* Calendar Event Modal */}
      {isEventModalOpen && (
        <EventModal
          eventToEdit={eventToEdit}
          initialDate={initialEventDate}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleSaveEvent}
        />
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(loggedUser) => {
            setUser(loggedUser);
            showToast(`Bienvenido ${loggedUser.nombre} (${loggedUser.rol})`);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
          <span className="font-semibold text-slate-400">
            Sistema de Registro de Asistencia &copy; {new Date().getFullYear()}
          </span>
          <span className="text-[11px] font-mono bg-slate-900 px-3 py-1 rounded-full border border-slate-800 text-amber-500/80">
            Diseñado y Desarrollado por <b className="text-amber-500">Ismael Hernández</b>
          </span>
        </div>
      </footer>

    </div>
  );
}
