import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
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
app.use(express.json({ limit: "10mb" }));

app.post("/analyze", async (req, res) => {
  try {
    const { text, previousNotes = [] } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "No llegó texto para analizar",
      });
    }

    const context = previousNotes
      .slice(0, 20)
      .map((note, index) => `${index + 1}. ${note.text}`)
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
    const cleanText = rawText.replace(/```json|```/g, "").trim();
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
    const cleanText = rawText.replace(/```json|```/g, "").trim();
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor listo para recibir transcripciones");
  console.log(`Servidor escuchando en puerto ${PORT}`);
});