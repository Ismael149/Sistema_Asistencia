const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Inicializar BD
require('./db');

const authRoutes = require('./routes/auth');
const personasRoutes = require('./routes/personas');
const eventosRoutes = require('./routes/eventos');
const asistenciasRoutes = require('./routes/asistencias');
const reportesRoutes = require('./routes/reportes');
const bitacoraRoutes = require('./routes/bitacora');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/bitacora', bitacoraRoutes);

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema Registro de Asistencia API funcionando correctamente' });
});

// Servir archivos estáticos del frontend en producción
const clientDistPath = path.join(__dirname, '../dist');
app.use(express.static(clientDistPath));

// Catch-all para SPA
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta API no encontrada' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Servidor Backend en ejecución. Por favor inicie el servidor Vite frontend en modo desarrollo.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose exitosamente en el puerto ${PORT}`);
  console.log(`🔗 Backend API: http://localhost:${PORT}/api/health`);
});
