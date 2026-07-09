import { useState } from "react";
import { VoiceRecorder } from "capacitor-voice-recorder";
import {
  analyzeTextIdea,
  parseReminderText,
  transcribeAudioFile,
} from "../services/api.js";
import { createNote, loadData, saveData } from "../services/storage.js";

function base64ToFile(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new File(byteArrays, "idea-audio.aac", {
    type: mimeType || "audio/aac",
  });
}

function looksLikeReminder(text = "") {
  const lower = text.toLowerCase();

  return [
    "recuérdame",
    "recordarme",
    "tengo que",
    "debo",
    "mañana",
    "pasado mañana",
    "lunes",
    "martes",
    "miércoles",
    "miercoles",
    "jueves",
    "viernes",
    "sábado",
    "sabado",
    "domingo",
    "a las",
    "el día",
    "el dia",
    "próximo",
    "proximo",
  ].some((word) => lower.includes(word));
}

function VoiceIdea({
  data,
  setData,
  onSaveNote,
  onSaveReminder,
  setScreen,
}) {
  const [ideaText, setIdeaText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [audioMimeType, setAudioMimeType] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedReminder, setDetectedReminder] = useState(null);
  const [isDetectingReminder, setIsDetectingReminder] = useState(false);

  async function startRecording() {
    try {
      const canRecord = await VoiceRecorder.canDeviceVoiceRecord();

      if (!canRecord.value) {
        alert("Este dispositivo no permite grabar audio.");
        return;
      }

      const permission = await VoiceRecorder.requestAudioRecordingPermission();

      if (!permission.value) {
        alert("No hay permiso para usar el micrófono.");
        return;
      }

      setAudioUrl(null);
      setAudioData(null);
      setAudioMimeType(null);
      setAnalysis(null);
      setDetectedReminder(null);

      await VoiceRecorder.startRecording();
      setIsRecording(true);
    } catch (error) {
      alert("No se pudo iniciar la grabación.");
      console.error(error);
    }
  }

  async function stopRecording() {
    try {
      const result = await VoiceRecorder.stopRecording();
      setIsRecording(false);

      const base64 = result.value.recordDataBase64;
      const mimeType = result.value.mimeType || "audio/aac";
      const url = `data:${mimeType};base64,${base64}`;

      setAudioData(base64);
      setAudioMimeType(mimeType);
      setAudioUrl(url);
    } catch (error) {
      alert("No se pudo detener la grabación.");
      console.error(error);
    }
  }

  function discardAudio() {
    setAudioUrl(null);
    setAudioData(null);
    setAudioMimeType(null);
    setDetectedReminder(null);
  }

  async function detectReminderFromText(text) {
    if (!looksLikeReminder(text)) return;

    try {
      setIsDetectingReminder(true);
      const reminder = await parseReminderText(text);

      if (reminder?.dateTime && reminder?.title) {
        setDetectedReminder(reminder);
      }
    } catch (error) {
      console.warn("No se detectó recordatorio:", error);
    } finally {
      setIsDetectingReminder(false);
    }
  }

  async function transcribeAudio() {
    if (!audioData) {
      alert("No hay audio para transcribir.");
      return;
    }

    try {
      setIsTranscribing(true);

      const audioFile = base64ToFile(audioData, audioMimeType);
      const text = await transcribeAudioFile(audioFile);

      setIdeaText(text);
      setAnalysis(null);
      setDetectedReminder(null);

      await detectReminderFromText(text);
    } catch (error) {
      alert("No se pudo transcribir el audio: " + error.message);
      console.error(error);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function analyzeIdea() {
    if (!ideaText.trim()) {
      alert("Primero transcribe o escribe una idea.");
      return;
    }

    try {
      setIsAnalyzing(true);

      const currentData = loadData();
      const previousNotes = Array.isArray(currentData?.notes)
        ? currentData.notes
        : Array.isArray(data?.notes)
        ? data.notes
        : [];

      const result = await analyzeTextIdea(ideaText, previousNotes);
      setAnalysis(result);
    } catch (error) {
      alert("No se pudo analizar la idea: " + error.message);
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function resetForm() {
    setIdeaText("");
    setAudioUrl(null);
    setAudioData(null);
    setAudioMimeType(null);
    setAnalysis(null);
    setDetectedReminder(null);
  }

  function saveIdea() {
    if (!ideaText.trim() && !audioData) {
      alert("No hay ninguna idea para guardar.");
      return;
    }

    try {
      const newNote = createNote({
        text: ideaText,
        audioData,
        audioMimeType,
        analysis,
      });

      const currentData = loadData();

      const currentNotes = Array.isArray(currentData?.notes)
        ? currentData.notes
        : [];

      const updatedData = {
        ...currentData,
        notes: [newNote, ...currentNotes],
      };

      saveData(updatedData);

      if (typeof setData === "function") {
        setData(updatedData);
      } else if (typeof onSaveNote === "function") {
        onSaveNote({
          text: ideaText,
          audioData,
          audioMimeType,
          analysis,
        });
      }

      resetForm();
      setScreen("home");
    } catch (error) {
      console.error("Error guardando idea:", error);
      alert("No se pudo guardar la idea.");
    }
  }

  function saveDetectedReminder() {
    if (!detectedReminder) return;

    onSaveReminder({
      originalText: ideaText,
      parsedReminder: detectedReminder,
    });

    alert("Recordatorio guardado.");
    setDetectedReminder(null);
  }

  return (
    <main className="app">
      <button className="back" onClick={() => setScreen("home")}>
        ← Volver
      </button>

      <section className="panel">
        <h1>🎤 Hablar</h1>
        <p>Graba una idea, transcríbela, analízala y guárdala como texto.</p>

        <div className="recordBox">
          {!isRecording ? (
            <button className="recordButton" onClick={startRecording}>
              🎤 Iniciar grabación
            </button>
          ) : (
            <button className="recordButton recording" onClick={stopRecording}>
              ⏹ Detener grabación
            </button>
          )}

          {audioUrl && (
            <div className="audioPreview">
              <p>Audio grabado:</p>
              <audio controls src={audioUrl}></audio>

              <button className="action primary" onClick={transcribeAudio}>
                {isTranscribing ? "Transcribiendo..." : "Transcribir audio"}
              </button>

              <button className="deleteButton" onClick={discardAudio}>
                Eliminar audio
              </button>
            </div>
          )}
        </div>

        <textarea
          placeholder="Aquí aparecerá la transcripción. También puedes escribir manualmente..."
          value={ideaText}
          onChange={(event) => {
            setIdeaText(event.target.value);
            setAnalysis(null);
            setDetectedReminder(null);
          }}
        />

        {isDetectingReminder && (
          <div className="card">
            <p>Buscando si esto también es un recordatorio...</p>
          </div>
        )}

        {detectedReminder && (
          <div className="card">
            <h3>📅 Recordatorio detectado</h3>

            <p>
              <strong>Título:</strong> {detectedReminder.title}
            </p>

            <p>
              <strong>Descripción:</strong> {detectedReminder.description}
            </p>

            <p>
              <strong>Fecha:</strong>{" "}
              {new Date(detectedReminder.dateTime).toLocaleString()}
            </p>

            <p>
              <strong>Aviso previo:</strong>{" "}
              {detectedReminder.notifyMinutesBefore || 5} minutos
            </p>

            <button className="action primary" onClick={saveDetectedReminder}>
              Guardar como recordatorio
            </button>
          </div>
        )}

        <button className="action" onClick={analyzeIdea}>
          {isAnalyzing ? "Analizando..." : "Analizar idea"}
        </button>

        {analysis && (
          <div className="card">
            <h3>🧠 Análisis</h3>

            <p>
              <strong>Resumen:</strong> {analysis.summary}
            </p>

            <p>
              <strong>Proyecto:</strong> {analysis.project}
            </p>

            <p>
              <strong>Etiquetas:</strong> {analysis.tags?.join(", ")}
            </p>

            <p>
              <strong>Conexiones:</strong>
            </p>

            <ul>
              {analysis.connections?.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <p>
              <strong>Próximos pasos:</strong>
            </p>

            <ul>
              {analysis.nextSteps?.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="action primary" onClick={saveIdea}>
          Guardar idea
        </button>
      </section>
    </main>
  );
}

export default VoiceIdea;