import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import curpRouter from './routes/curp.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Registrar rutas
app.use('/api/curp', curpRouter);

// Endpoint de prueba
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'CURP API running' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
