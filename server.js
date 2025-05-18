const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = 3002;

app.use(express.static("public"));

let datos = null;

try {
  const filePath = path.join(__dirname, "data", "datos.json");
  const rawData = fs.readFileSync(filePath, "utf-8");
  datos = JSON.parse(rawData);
} catch (error) {
  console.error("Error al cargar datos.json:", error);
  process.exit(1); // Detiene el servidor si no puede cargar los datos
}

// Ruta para enviar el JSON completo
app.get("/api/datos", (req, res) => {
  res.json(datos);
});

// Ruta para obtener la lista de localidades
app.get("/api/localidades", (req, res) => {
  try {
    const localidades = datos.localidades.map((loc) => loc.nombre);
    res.json({ localidades });
  } catch (error) {
    console.error("Error al obtener localidades:", error);
    res.status(500).json({ error: "Error al obtener la lista de localidades" });
  }
});

// Ruta para media global
app.get("/api/media-global", (req, res) => {
  try {
    const todasLasMaximas = datos.localidades.flatMap((loc) =>
      loc.temperaturas.map((t) => parseFloat(t.max))
    );

    if (todasLasMaximas.length === 0) {
      return res
        .status(404)
        .json({ error: "No hay temperaturas disponibles" });
    }

    const suma = todasLasMaximas.reduce((acc, temp) => acc + temp, 0);
    const media = suma / todasLasMaximas.length;

    res.json({ media: parseFloat(media.toFixed(2)) }); // Asegura que el resultado es un número
  } catch (error) {
    console.error("Error al calcular la media global:", error);
    res.status(500).json({ error: "Error al calcular la media global" });
  }
});

// Ruta para media por localidad
app.get("/api/media-localidad/:nombre", (req, res) => {
  try {
    const nombre = decodeURIComponent(req.params.nombre);
    const localidad = datos.localidades.find((loc) => loc.nombre === nombre);

    if (!localidad) {
      return res.status(404).json({ error: "Localidad no encontrada" });
    }

    const maximas = localidad.temperaturas.map((t) => parseFloat(t.max));
    const suma = maximas.reduce((acc, temp) => acc + temp, 0);
    const media = suma / maximas.length;

    res.json({ media: parseFloat(media.toFixed(2)) });
  } catch (error) {
    console.error("Error al calcular la media por localidad:", error);
    res
      .status(500)
      .json({ error: "Error al calcular la media por localidad" });
  }
});

// Ruta para media por día
app.get("/api/media-dia/:dia", (req, res) => {
  try {
    const dia = parseInt(req.params.dia);

    if (isNaN(dia) || dia < 0 || dia > 6) {
      return res.status(400).json({ error: "Día inválido (0-6)" });
    }

    const maximasDelDia = datos.localidades
      .map((loc) => loc.temperaturas[dia]?.max)
      .filter((max) => max !== undefined)
      .map((max) => parseFloat(max));

    if (maximasDelDia.length === 0) {
      return res.status(404).json({ error: "No hay datos para ese día" });
    }

    const suma = maximasDelDia.reduce((acc, t) => acc + t, 0);
    const media = suma / maximasDelDia.length;

    res.json({ media: parseFloat(media.toFixed(2)) });
  } catch (error) {
    console.error("Error al calcular la media por día:", error);
    res.status(500).json({ error: "Error al calcular la media por día" });
  }
});

// Ruta para filtro por umbral
app.get("/api/filtro-umbral", (req, res) => {
  try {
    const umbral = parseFloat(req.query.umbral);
    const condicion = req.query.condicion;

    if (isNaN(umbral) || !["mayor", "menor"].includes(condicion)) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    const resultados = [];

    datos.localidades.forEach((loc) => {
      loc.temperaturas.forEach((t) => {
        const tempMax = parseFloat(t.max);
        if (
          (condicion === "mayor" && tempMax > umbral) ||
          (condicion === "menor" && tempMax < umbral)
        ) {
          resultados.push({
            localidad: loc.nombre,
            dia: t.dia,
            max: tempMax,
          });
        }
      });
    });

    res.json({ resultados });
  } catch (error) {
    console.error("Error al filtrar por umbral:", error);
    res.status(500).json({ error: "Error al filtrar por umbral" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
