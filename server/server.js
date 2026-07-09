import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

dotenv.config();

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Servidor Mi Cerebro IA funcionando");
});

function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

function cleanJsonText(rawText = "") {
  return rawText.replace(/```json|```/g, "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function limitText(text = "", maxLength = 12000) {
  if (typeof text !== "string") return "";
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function getNoteText(note) {
  return (
    note?.text ||
    note?.transcription ||
    note?.transcript ||
    note?.content ||
    note?.analysis?.summary ||
    ""
  );
}

function getNoteProject(note) {
  return (
    note?.analysis?.project ||
    note?.analysis?.proyecto ||
    note?.project ||
    "Sin proyecto"
  );
}

function formatNotesForContext(notes = [], maxNotes = 30) {
  return safeArray(notes)
    .slice(0, maxNotes)
    .map((note, index) => {
      const text = getNoteText(note);
      const project = getNoteProject(note);
      const date = note?.createdAt || note?.date || "Sin fecha";

      return `${index + 1}. Fecha: ${date}
Proyecto: ${project}
Idea: ${text}`;
    })
    .join("\n\n");
}

function formatRemindersForContext(reminders = [], maxReminders = 20) {
  return safeArray(reminders)
    .slice(0, maxReminders)
    .map((reminder, index) => {
      return `${index + 1}. ${reminder?.title || reminder?.text || "Recordatorio"}
Fecha: ${reminder?.dateTime || "Sin fecha"}
Descripción: ${reminder?.description || ""}`;
    })
    .join("\n\n");
}

function formatProjectsForContext(memory = {}) {
  const projects = memory?.projects || {};

  if (!projects || typeof projects !== "object") {
    return "";
  }

  return Object.entries(projects)
    .map(([projectName, projectData]) => {
      const summaries = safeArray(projectData?.summaries)
        .slice(0, 5)
        .join(" | ");

      return `Proyecto: ${projectName}
Ideas registradas: ${projectData?.notesCount || 0}
Resumen: ${summaries || "Sin resumen todavía"}`;
    })
    .join("\n\n");
}

function formatConceptsForContext(memory = {}) {
  const concepts = memory?.concepts || {};

  if (!concepts || typeof concepts !== "object") {
    return "";
  }

  return Object.entries(concepts)
    .slice(0, 20)
    .map(([conceptName, count]) => `${conceptName}: ${count} menciones`)
    .join("\n");
}

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  console.log("PETICIÓN RECIBIDA");

  let inputPath = null;
  let mp3Path = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No llegó ningún archivo de audio",
      });
    }

    console.log("Archivo recibido:", req.file);

    inputPath = `${req.file.path}.aac`;
    mp3Path = `${req.file.path}.mp3`;

    fs.renameSync(req.file.path, inputPath);

    console.log("Convirtiendo audio a mp3...");
    await convertToMp3(inputPath, mp3Path);

    console.log("Enviando mp3 a OpenAI...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(mp3Path),
      model: "gpt-4o-mini-transcribe",
      language: "es",
    });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(mp3Path);

    res.json({
      success: true,
      text: transcription.text,
    });
  } catch (error) {
    console.error("ERROR TRANSCRIPCIÓN:", error);

    if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (mp3Path && fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/analyze", async (req, res) => {
  try {
    const { text, previousNotes = [] } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "No llegó texto para analizar",
      });
    }

    const context = safeArray(previousNotes)
      .slice(0, 20)
      .map((note, index) => `${index + 1}. ${getNoteText(note)}`)
      .join("\n");

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Eres "Mi Cerebro IA", un asistente personal de pensamiento estratégico.
Tu tarea es ayudar a Eugen a ordenar ideas de negocio, proyectos y decisiones.

Proyectos conocidos:
- Oë: gafas de madera artesanales.
- 33 Raw Elements: línea premium de gafas de ébano.
- La Ruta Artesana: app/red para conectar artesanos, territorio y personas.
- Escuela de Oficios: plataforma de formación artesanal con salida laboral.
- Mi Cerebro IA: app personal de notas, memoria y agenda con IA.

Notas anteriores relevantes:
${context || "Todavía no hay notas anteriores."}

Nueva idea:
${text}

Devuelve una respuesta clara en JSON válido con esta estructura:
{
  "summary": "resumen breve de la idea",
  "project": "proyecto principal detectado",
  "tags": ["tema1", "tema2", "tema3"],
  "connections": ["conexión con ideas o proyectos anteriores"],
  "nextSteps": ["paso 1", "paso 2", "paso 3"]
}
`,
    });

    const rawText = response.output_text;
    const cleanText = cleanJsonText(rawText);
    const analysis = JSON.parse(cleanText);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("ERROR ANÁLISIS:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/parse-reminder", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "No llegó texto para interpretar",
      });
    }

    const now = new Date();

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Hoy es: ${now.toISOString()}.

Interpreta este recordatorio en español:
"${text}"

Devuelve SOLO JSON válido con esta estructura:
{
  "title": "título corto del recordatorio",
  "description": "detalle del recordatorio",
  "dateTime": "fecha y hora en formato ISO 8601",
  "notifyMinutesBefore": 5
}

Si no hay aviso previo especificado, usa 5 minutos.
`,
    });

    const rawText = response.output_text;
    const cleanText = cleanJsonText(rawText);
    const reminder = JSON.parse(cleanText);

    res.json({
      success: true,
      reminder,
    });
  } catch (error) {
    console.error("ERROR RECORDATORIO:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/ask-memory", async (req, res) => {
  try {
    const { question, context = {} } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "No llegó ninguna pregunta para responder",
      });
    }

    const calibrationText = context?.calibration?.text || "";
    const recentNotesText = formatNotesForContext(
      context?.recentNotes || context?.notes || [],
      30
    );
    const remindersText = formatRemindersForContext(context?.reminders || [], 20);
    const projectsText = formatProjectsForContext(context?.memory || {});
    const conceptsText = formatConceptsForContext(context?.memory || {});

    const memoryContext = limitText(
      `
CALIBRANDO / MEMORIA ACUMULADA:
${calibrationText || "Todavía no hay Calibrando creado."}

MEMORIA POR PROYECTOS:
${projectsText || "Todavía no hay memoria por proyectos."}

CONCEPTOS FRECUENTES:
${conceptsText || "Todavía no hay conceptos frecuentes."}

ÚLTIMAS IDEAS:
${recentNotesText || "Todavía no hay ideas recientes."}

RECORDATORIOS:
${remindersText || "No hay recordatorios relevantes."}
`,
      15000
    );

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Eres "Mi Cerebro IA", un agente personal de pensamiento estratégico para Eugen.

No eres un asistente genérico.
Respondes usando la memoria de Eugen, sus proyectos, sus ideas, sus decisiones y sus patrones.

Proyectos conocidos:
- Oë: gafas de madera artesanales.
- 33 Raw Elements: línea premium de gafas de ébano, ébano, territorio, estética sobria, volcánica, artesanal y premium.
- La Ruta Artesana: app/red para conectar artesanos, territorio y personas.
- Escuela de Oficios: formación artesanal con salida laboral.
- Mi Cerebro IA: segundo cerebro personal, notas, memoria, agenda, recordatorios y agente con IA.

Memoria disponible:
${memoryContext}

Pregunta de Eugen:
${question}

Responde en español, de forma clara, directa y útil.

Si la pregunta pide conclusiones o estrategia, usa este formato:

Conclusión

Lo que veo:
...

Prioridad:
...

Riesgo:
...

Oportunidad:
...

Qué haría ahora:
1. ...
2. ...
3. ...

Reglas:
- No inventes datos que no estén en la memoria.
- Puedes razonar y sacar conclusiones, pero deja claro cuando sea una interpretación.
- Sé concreto.
- No escribas demasiado.
- Prioriza acciones útiles.
- Si falta información, dilo y propone qué tendría que registrar Eugen para mejorar la respuesta.
`,
    });

    const answer = response.output_text?.trim() || "No pude generar una respuesta.";

    res.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("ERROR ASK MEMORY:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor listo para recibir transcripciones");
  console.log(`Servidor escuchando en puerto ${PORT}`);
});