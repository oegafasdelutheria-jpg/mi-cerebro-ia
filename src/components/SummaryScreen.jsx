import { useEffect, useState } from "react";
import { getMemoryOverview } from "../engine/brainEngine";
import { calibrateMemory, summarizeTodayNotes } from "../services/api.js";
import {
  buildBasicDailySummary,
  getCalibration,
  getDailySummary,
  getDateKey,
  getTodayNotes,
  getUnprocessedNotesForCalibration,
  loadData,
  saveCalibration,
  saveDailySummary,
} from "../services/storage.js";

function getSafeMemory(memory) {
  return {
    projects:
      memory?.projects && typeof memory.projects === "object"
        ? memory.projects
        : {},

    concepts:
      memory?.concepts && typeof memory.concepts === "object"
        ? memory.concepts
        : {},
  };
}

function getSafeOverview(memory) {
  try {
    const overview = getMemoryOverview(getSafeMemory(memory));

    return {
      projects: Array.isArray(overview?.projects) ? overview.projects : [],
      concepts: Array.isArray(overview?.concepts) ? overview.concepts : [],
    };
  } catch (error) {
    console.error("Error leyendo memoria:", error);

    return {
      projects: [],
      concepts: [],
    };
  }
}

function safeDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no válida";
  }

  return date.toLocaleString();
}

function SummaryScreen({ data, setData, setScreen }) {
  const safeData = {
    notes: Array.isArray(data?.notes) ? data.notes : [],
    reminders: Array.isArray(data?.reminders) ? data.reminders : [],
    memory: getSafeMemory(data?.memory),
  };

  const overview = getSafeOverview(safeData.memory);
  const todayKey = getDateKey();

  const [todaySummary, setTodaySummary] = useState(null);
  const [todayNotesCount, setTodayNotesCount] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [calibration, setCalibration] = useState(() => getCalibration());
  const [newCalibrationNotesCount, setNewCalibrationNotesCount] = useState(0);
  const [loadingCalibration, setLoadingCalibration] = useState(false);

  useEffect(() => {
    loadTodaySummary();
    loadCalibrationData();
  }, [data?.notes]);

  function loadTodaySummary() {
    try {
      const notes = getTodayNotes();
      const savedSummary = getDailySummary(todayKey);

      setTodayNotesCount(notes.length);
      setTodaySummary(savedSummary);
    } catch (error) {
      console.error("Error cargando resumen de hoy:", error);
      setTodayNotesCount(0);
      setTodaySummary(null);
    }
  }

  function loadCalibrationData() {
    try {
      const currentCalibration = getCalibration();
      const pendingNotes = getUnprocessedNotesForCalibration();

      setCalibration(currentCalibration);
      setNewCalibrationNotesCount(pendingNotes.length);
    } catch (error) {
      console.error("Error cargando Calibrando:", error);
      setCalibration({
        text: "",
        updatedAt: null,
        processedNoteIds: [],
      });
      setNewCalibrationNotesCount(0);
    }
  }

  async function handleGenerateTodaySummary() {
    setLoadingSummary(true);

    try {
      const notes = getTodayNotes();

      if (notes.length === 0) {
        const savedEmptySummary = saveDailySummary({
          date: todayKey,
          title: "Resumen de hoy",
          text: "Hoy todavía no hay ideas guardadas para resumir.",
          noteIds: [],
        });

        setTodaySummary(savedEmptySummary);
        setTodayNotesCount(0);

        if (typeof setData === "function") {
          setData(loadData());
        }

        return;
      }

      let result;

      try {
        result = await summarizeTodayNotes(notes);
      } catch (error) {
        console.error("Error usando IA para resumir. Uso resumen básico:", error);

        result = {
          text: buildBasicDailySummary(notes),
          analysis: null,
          noteIds: notes.map((note) => note?.id).filter(Boolean),
        };
      }

      const savedSummary = saveDailySummary({
        date: todayKey,
        title: "Resumen de hoy",
        text: result?.text || buildBasicDailySummary(notes),
        noteIds: Array.isArray(result?.noteIds)
          ? result.noteIds
          : notes.map((note) => note?.id).filter(Boolean),
      });

      setTodaySummary(savedSummary);
      setTodayNotesCount(notes.length);

      if (typeof setData === "function") {
        setData(loadData());
      }
    } catch (error) {
      console.error("Error generando resumen de hoy:", error);
      alert("No se pudo generar el resumen de hoy.");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleCalibrateMemory() {
    setLoadingCalibration(true);

    try {
      const currentCalibration = getCalibration();
      const pendingNotes = getUnprocessedNotesForCalibration();

      if (pendingNotes.length === 0) {
        alert("No hay ideas nuevas para integrar en Calibrando.");
        return;
      }

      const result = await calibrateMemory({
        previousCalibration: currentCalibration?.text || "",
        newNotes: pendingNotes,
      });

      const previousProcessedIds = Array.isArray(
        currentCalibration?.processedNoteIds
      )
        ? currentCalibration.processedNoteIds
        : [];

      const newProcessedIds = Array.isArray(result?.noteIds)
        ? result.noteIds
        : pendingNotes.map((note) => note?.id).filter(Boolean);

      const processedNoteIds = Array.from(
        new Set([...previousProcessedIds, ...newProcessedIds])
      );

      const savedCalibration = saveCalibration({
        text:
          result?.text ||
          currentCalibration?.text ||
          "No se pudo actualizar Calibrando con claridad.",
        updatedAt: new Date().toISOString(),
        processedNoteIds,
      });

      setCalibration(savedCalibration);
      setNewCalibrationNotesCount(0);

      if (typeof setData === "function") {
        setData(loadData());
      }
    } catch (error) {
      console.error("Error actualizando Calibrando:", error);
      alert("No se pudo actualizar Calibrando.");
    } finally {
      setLoadingCalibration(false);
    }
  }

  return (
    <main className="app">
      <button className="back" onClick={() => setScreen("home")}>
        ← Volver
      </button>

      <section className="panel">
        <h1>📋 Resumen</h1>

        <p>
          Ideas guardadas: <strong>{safeData.notes.length}</strong>
        </p>

        <p>
          Recordatorios guardados: <strong>{safeData.reminders.length}</strong>
        </p>

        <section className="card">
          <h2>☀️ Resumen de hoy</h2>

          <p>
            Ideas registradas hoy: <strong>{todayNotesCount}</strong>
          </p>

          <button
            type="button"
            onClick={handleGenerateTodaySummary}
            disabled={loadingSummary}
          >
            {loadingSummary ? "Generando resumen..." : "Hazme un resumen de hoy"}
          </button>

          {todaySummary?.text ? (
            <div style={{ marginTop: "1rem" }}>
              <small>{todaySummary.date || todayKey}</small>

              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {todaySummary.text}
              </pre>
            </div>
          ) : (
            <p>Todavía no has generado un resumen para hoy.</p>
          )}
        </section>

        <section className="card">
          <h2>🧠 Calibrando</h2>

          <p>
            Ideas nuevas por integrar:{" "}
            <strong>{newCalibrationNotesCount}</strong>
          </p>

          <button
            type="button"
            onClick={handleCalibrateMemory}
            disabled={loadingCalibration || newCalibrationNotesCount === 0}
          >
            {loadingCalibration ? "Calibrando..." : "Calibrando"}
          </button>

          {calibration?.text ? (
            <div style={{ marginTop: "1rem" }}>
              <small>
                Última actualización: {safeDate(calibration.updatedAt)}
              </small>

              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {calibration.text}
              </pre>
            </div>
          ) : (
            <p>Todavía no has creado una calibración general.</p>
          )}
        </section>

        <h2>Memoria por proyecto</h2>

        {overview.projects.length === 0 ? (
          <p>Todavía no hay memoria por proyecto.</p>
        ) : (
          <div className="list">
            {overview.projects.map((project, index) => (
              <article className="card" key={project?.name || index}>
                <h3>{project?.name || "Proyecto sin nombre"}</h3>

                <p>
                  Ideas: <strong>{project?.notesCount || 0}</strong>
                </p>

                {Array.isArray(project?.summaries) &&
                  project.summaries.length > 0 && (
                    <>
                      <p>
                        <strong>Últimos resúmenes:</strong>
                      </p>

                      <ul>
                        {project.summaries.slice(0, 3).map((summary, i) => (
                          <li key={i}>{summary}</li>
                        ))}
                      </ul>
                    </>
                  )}
              </article>
            ))}
          </div>
        )}

        <h2>Conceptos frecuentes</h2>

        {overview.concepts.length === 0 ? (
          <p>Todavía no hay conceptos frecuentes.</p>
        ) : (
          <div className="list">
            {overview.concepts.slice(0, 10).map((concept, index) => (
              <article className="card" key={concept?.name || index}>
                <p>
                  <strong>{concept?.name || "Concepto sin nombre"}</strong> —{" "}
                  {concept?.count || 0} menciones
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default SummaryScreen;