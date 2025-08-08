const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/obtener-script', async (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).send('No autorizado');
  }

  try {
    // Obtener listado de archivos en LUAU
    const listResponse = await axios.get(
      'https://api.github.com/repos/OkumaruSenpai/Sytem2.0/contents/LUAU',
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const files = listResponse.data; // Array con info de archivos

    if (!files.length) {
      return res.status(404).send('No se encontraron scripts');
    }

    // Obtener el primer archivo (puedes cambiar la lógica aquí)
    const firstFile = files[0];

    // Descargar contenido crudo del archivo usando download_url
    const fileResponse = await axios.get(firstFile.download_url);

    res.send(fileResponse.data);
  } catch (error) {
    res.status(500).send('Error al obtener el script');
    console.error('Error al llamar a GitHub API:', error.response?.status, error.response?.data || error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
