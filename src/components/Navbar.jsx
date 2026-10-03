import React from 'react';
import { Calendar, CheckSquare, Users, FileSpreadsheet, ShieldAlert, LogIn, LogOut, UserCheck, Sun, Moon } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onOpenLogin, onLogout, lightMode, setLightMode }) {
  const isAdmin = user && user.rol === 'admin';

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & System Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('calendar')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Asistencia<span className="text-rose-500 font-extrabold">PSUV</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Control de Asistencia a Eventos Comunales</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario & Eventos</span>
            </button>

            <button
              onClick={() => setActiveTab('asistencia')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'asistencia'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Tomar Asistencia</span>
            </button>

            {/* ADMIN ONLY TABS */}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin-personas')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin-personas'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Gestionar Lista</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-reports')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin-reports'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Reportes</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-bitacora')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin-bitacora'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>Bitácora</span>
                </button>
              </>
            )}
          </nav>

          {/* User Auth Section & Theme Toggle */}
          <div className="flex items-center space-x-3">

            {/* Divider */}
            <div className="hidden md:block w-px h-6 bg-slate-700 mx-2"></div>

            <button
              onClick={() => setLightMode(!lightMode)}
              className="p-2 rounded-xl bg-slate-800/60 text-amber-400 hover:bg-slate-800 transition-colors border border-slate-700/50"
              title={lightMode ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
            >
              {lightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white">{user.nombre}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${user.rol === 'admin' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {user.rol === 'admin' ? '⚡ Administrador' : 'Operador'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Cerrar Sesión"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-medium text-sm shadow-md shadow-rose-950/50 transition-all hover:scale-105"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Nav Tabs Bar */}
      <div className="md:hidden flex overflow-x-auto px-2 py-2 border-t border-slate-800 bg-slate-900/90 gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === 'calendar' ? 'bg-rose-600 text-white' : 'text-slate-300'
          }`}
        >
          📅 Calendario
        </button>
        <button
          onClick={() => setActiveTab('asistencia')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
            activeTab === 'asistencia' ? 'bg-rose-600 text-white' : 'text-slate-300'
          }`}
        >
          ✅ Asistencia
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('admin-personas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === 'admin-personas' ? 'bg-rose-600 text-white' : 'text-slate-300'
              }`}
            >
              👥 Personas
            </button>
            <button
              onClick={() => setActiveTab('admin-reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === 'admin-reports' ? 'bg-rose-600 text-white' : 'text-slate-300'
              }`}
            >
              📊 Reportes
            </button>
            <button
              onClick={() => setActiveTab('admin-bitacora')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                activeTab === 'admin-bitacora' ? 'bg-rose-600 text-white' : 'text-slate-300'
              }`}
            >
              🛡️ Bitácora
            </button>
          </>
        )}
      </div>
    </header>
  );
}
