document.addEventListener("DOMContentLoaded", () => {
    const refs = {
        localidad: document.getElementById("localidad"),
        dia: document.getElementById("dia"),
        avglocalidad: document.getElementById("avglocalidad"),
        avgdia: document.getElementById("avgdia"),
        avg: document.getElementById("avg"),
        resLocalidad: document.getElementById("res_avglocalidad"),
        resDia: document.getElementById("res_avgdia"),
        resGlobal: document.getElementById("res_avg"),
        umbral: document.getElementById("umbralInput"),
        condicion: document.getElementById("condicionUmbral"),
        btnUmbral: document.getElementById("btnUmbral"),
        resUmbral: document.getElementById("resultadoUmbral"),
        localidadResumen: document.getElementById("localidadResumen"),
        btnResumen: document.getElementById("btnResumenSemanal"),
        resResumen: document.getElementById("resultadoResumenSemanal"),
        fechaInicio: document.getElementById("fechaInicio"),
        fechaFin: document.getElementById("fechaFin"),
        btnAnalisis: document.getElementById("btnAnalisis"),
        resAnalisis: document.getElementById("resultadoAnalisis")
    };

        const mostrarError = (ref, msg) => ref.textContent = msg;

        const getJSON = (url) => fetch(url).then(res => {
            if (!res.ok) throw new Error("Error en la solicitud");
            return res.json();
    });

    const cargarLocalidades = () => {
        getJSON("/api/localidades").then(data => {
            const opciones = data.localidades.map(loc => `<option value="${loc}">${loc}</option>`).join("");
            const base = `<option disabled selected hidden value="">Selecciona una localidad</option>`;
            refs.localidad.innerHTML = base + opciones;
            refs.localidadResumen.innerHTML = base + opciones;
        }).catch(e => alert("No se pudieron cargar las localidades."));
    };

    const calcularMediaLocalidad = () => {
        const loc = refs.localidad.value;
        if (!loc) return mostrarError(refs.resLocalidad, "Selecciona una localidad.");
        getJSON(`/api/media-localidad/${encodeURIComponent(loc)}`)
            .then(data => refs.resLocalidad.textContent = `Media en ${loc}: ${data.media} °C`)
            .catch(() => mostrarError(refs.resLocalidad, "Error al calcular media."));
    };

    const calcularMediaDia = () => {
        const dia = refs.dia.value;
        if (!dia) return mostrarError(refs.resDia, "Selecciona un día.");
        getJSON(`/api/media-dia/${dia}`)
            .then(data => {
                const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                refs.resDia.textContent = `Media el ${dias[dia]}: ${data.media} °C`;
            }).catch(() => mostrarError(refs.resDia, "Error al calcular media."));
    };

    const calcularMediaGlobal = () => {
        getJSON("/api/media-global")
            .then(data => refs.resGlobal.textContent = `Media global: ${data.media} °C`)
            .catch(() => mostrarError(refs.resGlobal, "Error al calcular media global."));
    };

    const buscarPorUmbral = () => {
        const { value: umbral } = refs.umbral;
        const condicion = refs.condicion.value;
        if (!umbral) return mostrarError(refs.resUmbral, "Ingresa un valor de umbral.");
        getJSON(`/api/filtro-umbral?umbral=${umbral}&condicion=${condicion}`)
            .then(data => {
                if (data.resultados.length === 0) {
                    refs.resUmbral.textContent = "No hay coincidencias.";
                } else {
                    refs.resUmbral.innerHTML = "<h3>Coincidencias:</h3><ul>" +
                        data.resultados.map(r =>
                            `<li>${r.localidad}, ${r.dia}: ${r.max} °C</li>`).join("") +
                        "</ul>";
                }
            }).catch(() => mostrarError(refs.resUmbral, "Error en la búsqueda."));
    };

    const mostrarResumenSemanal = () => {
        const loc = refs.localidadResumen.value;
        if (!loc) return mostrarError(refs.resResumen, "Selecciona una localidad.");
        getJSON("/api/datos")
            .then(data => {
                const localidad = data.localidades.find(l => l.nombre === loc);
                if (!localidad) return mostrarError(refs.resResumen, "Localidad no encontrada.");
                const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                const filas = localidad.temperaturas.map((t, i) => {
                    const max = parseFloat(t.max);
                    const min = parseFloat(t.min);
                    const media = ((max + min) / 2).toFixed(2);
                    return `<tr><td>${dias[i]}</td><td>${max} °C</td><td>${min} °C</td><td>${media} °C</td></tr>`;
                }).join("");
                refs.resResumen.innerHTML = `<h3>Resumen de ${loc}</h3><table><thead><tr><th>Día</th><th>Máx</th><th>Mín</th><th>Media</th></tr></thead><tbody>${filas}</tbody></table>`;
            }).catch(() => mostrarError(refs.resResumen, "Error en el resumen."));
    };

    const analizarTemperaturas = () => {
        const ini = refs.fechaInicio.value;
        const fin = refs.fechaFin.value;
        if (!ini || !fin) return mostrarError(refs.resAnalisis, "Ingresa ambas fechas.");
        const iniDate = new Date(ini), finDate = new Date(fin);
        getJSON("/api/datos")
            .then(data => {
                let max = -Infinity, min = Infinity, locMax = "", locMin = "";
                data.localidades.forEach(loc => {
                    loc.temperaturas.forEach(t => {
                        const fecha = new Date(t.dia);
                        if (fecha >= iniDate && fecha <= finDate) {
                            const tMax = parseFloat(t.max), tMin = parseFloat(t.min);
                            if (tMax > max) [max, locMax] = [tMax, loc.nombre];
                            if (tMin < min) [min, locMin] = [tMin, loc.nombre];
                        }
                    });
                });
                refs.resAnalisis.innerHTML =
                    (locMax ? `<p>Mayor temperatura (${max}°C) en ${locMax}</p>` : "<p>No hay datos de máxima.</p>") +
                    (locMin ? `<p>Menor temperatura (${min}°C) en ${locMin}</p>` : "<p>No hay datos de mínima.</p>");
            }).catch(() => mostrarError(refs.resAnalisis, "Error en el análisis."));
    };

    // Listeners
    cargarLocalidades();
    refs.avglocalidad.addEventListener("click", calcularMediaLocalidad);
    refs.avgdia.addEventListener("click", calcularMediaDia);
    refs.avg.addEventListener("click", calcularMediaGlobal);
    refs.btnUmbral.addEventListener("click", buscarPorUmbral);
    refs.btnResumen.addEventListener("click", mostrarResumenSemanal);
    refs.btnAnalisis.addEventListener("click", analizarTemperaturas);
});
