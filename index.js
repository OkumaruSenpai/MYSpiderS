const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/obtener-script', async (req, res) => {
  const apiKey = req.headers['x-api-key'];  // Clave que espera el servidor

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).send('No autorizado');
  }

  try {
    const response = await axios.get(
      'https://api.github.com/repos/OkumaruSenpai/Sytem2.0/contents/LUAU',
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3.raw',
        },
      }
    );
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Error al obtener el script');
    console.error(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
