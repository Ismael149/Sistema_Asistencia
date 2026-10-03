import React from 'react';
import { ShieldCheck, LogIn, Lock, CheckSquare, Users, FileSpreadsheet, Calendar } from 'lucide-react';

export default function WelcomeScreen({ onOpenLogin }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg sm:max-w-2xl space-y-6 glass-panel p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">

        {/* Glow background accents */}
        <div className="absolute -top-20 -left-20 w-44 sm:w-60 h-44 sm:h-60 bg-rose-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-44 sm:w-60 h-44 sm:h-60 bg-amber-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* System Emblem */}
        <div className="flex justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-rose-950/60">
            <CheckSquare className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2 sm:space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-900/60 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Acceso Protegido y Seguro
          </span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Sistema de Registro<br className="sm:hidden" /> de Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm sm:max-w-xl mx-auto leading-relaxed">
            Plataforma para la toma de asistencia, gestión de eventos comunales y generación de reportes oficiales.
          </p>
        </div>

        {/* Security Message Box */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 space-y-1 max-w-sm sm:max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-2 font-bold text-amber-400 text-xs sm:text-sm">
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Autenticación Requerida
          </div>
          <p className="text-slate-400 text-[11px] sm:text-xs leading-relaxed">
            Debe iniciar sesión con sus credenciales autorizadas para consultar o modificar la información del sistema.
          </p>
        </div>

        {/* Feature Cards — horizontal scroll on very small screens, grid on larger */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
          <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 text-center sm:text-left space-y-1 sm:space-y-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 mx-auto sm:mx-0" />
            <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider leading-tight">
              <span className="sm:hidden">Eventos</span>
              <span className="hidden sm:inline">Calendario</span>
            </h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">Programación de eventos comunales por fecha.</p>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 text-center sm:text-left space-y-1 sm:space-y-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto sm:mx-0" />
            <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider leading-tight">Asistencia</h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">Base de datos e historial de asistencia.</p>
          </div>

          <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 text-center sm:text-left space-y-1 sm:space-y-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mx-auto sm:mx-0" />
            <h3 className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider leading-tight">Reportes</h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">Exportación en Excel y PDF oficial.</p>
          </div>
        </div>

        {/* Login Button */}
        <div className="pt-2">
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-xl shadow-rose-950/60 transition-all transform hover:scale-105 inline-flex items-center justify-center gap-3"
          >
            <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>INICIAR SESIÓN PARA ACCEDER</span>
          </button>
        </div>

      </div>
    </div>
  );
}
