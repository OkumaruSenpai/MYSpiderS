// index.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Utilidad para respuestas de error uniformes y con trazabilidad.
 */
function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    ok: false,
    code,
    message,
    ...extra,
  });
}

// Endpoint de salud
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'myspiders', time: new Date().toISOString() });
});

app.get('/obtener-script', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return sendError(res, 401, 'NO_API_KEY', 'Falta cabecera x-api-key');
  }
  if (apiKey !== process.env.API_KEY) {
    return sendError(res, 401, 'INVALID_API_KEY', 'No autorizado');
  }

  // Permite pedir un archivo concreto: /obtener-script?file=nombre.lua
  const requestedFile = (req.query.file || '').toString();

  // --- Validaciones de entorno ---
  if (!process.env.GITHUB_TOKEN) {
    return sendError(res, 500, 'NO_GITHUB_TOKEN', 'Falta GITHUB_TOKEN en variables de entorno');
  }

  try {
    // 1) Listar archivos en la carpeta LUAU del repo
    const listUrl = 'https://api.github.com/repos/OkumaruSenpai/Sytem2.0/contents/LUAU';

    const listResponse = await axios.get(listUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, // <- Bearer funciona mejor con PATs recientes
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'myspiders-app', // <- GitHub la exige
      },
      validateStatus: () => true, // manejamos nosotros los errores
    });

    if (listResponse.status === 401 || listResponse.status === 403) {
      return sendError(res, 502, 'GITHUB_AUTH',
        'GitHub rechazó la autenticación. Revisa que el token sea válido y tenga permisos de lectura de contenidos.',
        { githubStatus: listResponse.status, githubBody: listResponse.data }
      );
    }
    if (listResponse.status >= 400) {
      return sendError(res, 502, 'GITHUB_LIST',
        'Error listando archivos en GitHub.',
        { githubStatus: listResponse.status, githubBody: listResponse.data }
      );
    }

    const files = Array.isArray(listResponse.data) ? listResponse.data.filter(f => f.type === 'file') : [];

    if (!files.length) {
      return sendError(res, 404, 'NO_FILES', 'No se encontraron scripts en /LUAU del repo');
    }

    let fileMeta;

    if (requestedFile) {
      fileMeta = files.find(f => f.name === requestedFile);
      if (!fileMeta) {
        return sendError(res, 404, 'FILE_NOT_FOUND', `El archivo solicitado "${requestedFile}" no existe en /LUAU.`);
      }
    } else {
      // Selección determinista (o aleatoria si prefieres)
      // fileMeta = files[0];
      const idx = crypto.randomInt(0, files.length);
      fileMeta = files[idx];
    }

    if (!fileMeta.download_url) {
      return sendError(res, 502, 'NO_DOWNLOAD_URL', 'El contenido no tiene download_url');
    }

    // 2) Descargar el contenido crudo del archivo
    const fileResponse = await axios.get(fileMeta.download_url, {
      headers: {
        // La URL cruda normalmente no requiere auth, pero no estorba:
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.raw',
        'User-Agent': 'myspiders-app',
      },
      responseType: 'text',
      validateStatus: () => true,
    });

    if (fileResponse.status >= 400) {
      return sendError(res, 502, 'GITHUB_DOWNLOAD',
        'Error descargando el script desde GitHub.',
        { githubStatus: fileResponse.status, githubBody: fileResponse.data }
      );
    }

    // Devolver texto plano (el script)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(fileResponse.data);
  } catch (err) {
    console.error('Fallo inesperado:', err?.message, err?.stack);
    return sendError(res, 500, 'UNEXPECTED', 'Error inesperado al obtener el script', {
      error: err?.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en 0.0.0.0:${PORT}`);
});


