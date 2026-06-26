import { useState } from "react";
import { VoiceRecorder } from "capacitor-voice-recorder";
import { analyzeTextIdea, transcribeAudioFile } from "../services/api";

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

function VoiceIdea({ data, onSaveNote, setScreen }) {
  const [ideaText, setIdeaText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [audioMimeType, setAudioMimeType] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      const result = await analyzeTextIdea(ideaText, data.notes);
      setAnalysis(result);
    } catch (error) {
      alert("No se pudo analizar la idea: " + error.message);
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function saveIdea() {
    if (!ideaText.trim() && !audioData) return;

    onSaveNote({
      text: ideaText,
      audioData,
      audioMimeType,
      analysis,
    });

    setScreen("home");
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
          }}
        />

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