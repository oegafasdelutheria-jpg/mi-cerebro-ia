const API_BASE_URL = "https://mi-cerebro-api.onrender.com";

export const TRANSCRIBE_URL = `${API_BASE_URL}/transcribe`;
export const ANALYZE_URL = `${API_BASE_URL}/analyze`;
export const REMINDER_URL = `${API_BASE_URL}/parse-reminder`;

function getNoteText(note) {
  return (
    note?.text ||
    note?.transcription ||
    note?.transcript ||
    note?.content ||
    note?.analysis?.summary ||
    ""
  ).trim();
}

function getNoteProject(note) {
  return (
    note?.analysis?.project ||
    note?.analysis?.proyecto ||
    note?.project ||
    "Sin proyecto"
  );
}

function cleanNotesForSummary(notes = []) {
  if (!Array.isArray(notes)) return [];

  return notes
    .filter(Boolean)
    .map((note, index) => {
      const text = getNoteText(note);

      return {
        index: index + 1,
        id: note?.id || null,
        text,
        project: getNoteProject(note),
        createdAt: note?.createdAt || null,
      };
    })
    .filter((note) => note.text.length > 0);
}

export async function transcribeAudioFile(audioFile) {
  const formData = new FormData();
  formData.append("audio", audioFile);

  const response = await fetch(TRANSCRIBE_URL, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "No se pudo transcribir.");
  }

  return result.text;
}

export async function analyzeTextIdea(text, previousNotes = []) {
  const response = await fetch(ANALYZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      previousNotes,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "No se pudo analizar.");
  }

  return result.analysis;
}

export async function parseReminderText(text) {
  const response = await fetch(REMINDER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "No se pudo interpretar.");
  }

  return result.reminder;
}

export async function summarizeTodayNotes(notes = []) {
  const cleanNotes = cleanNotesForSummary(notes);

  if (cleanNotes.length === 0) {
    return {
      text: "Hoy todavía no hay ideas suficientes para resumir.",
      analysis: null,
      noteIds: [],
    };
  }

  const notesText = cleanNotes
    .map((note) => {
      return `${note.index}. Proyecto: ${note.project}
Idea: ${note.text}`;
    })
    .join("\n\n")
    .slice(0, 9000);

  const prompt = `Hazme un resumen claro, útil y conciso de las ideas que registré hoy.

Quiero que respondas en este formato exacto:

Resumen de hoy

Hoy registré [número] ideas.

Lo más importante:
- [máximo 3 puntos]

Proyectos mencionados:
- [proyecto]&#58; [resumen breve]

Próximos pasos:
1. [acción concreta]
2. [acción concreta]
3. [acción concreta]

Reglas:
- No inventes información.
- No escribas demasiado.
- Sé claro y directo.
- Si no hay próximos pasos claros, dilo.
- Máximo 12 líneas.

Ideas de hoy:

${notesText}`;

  const analysis = await analyzeTextIdea(prompt, []);

  const summaryText =
    analysis?.summary ||
    analysis?.resumen ||
    analysis?.text ||
    analysis?.response ||
    "No se pudo generar un resumen claro.";

  return {
    text: summaryText,
    analysis,
    noteIds: cleanNotes.map((note) => note.id).filter(Boolean),
  };
}export async function calibrateMemory({
  previousCalibration = "",
  newNotes = [],
}) {
  const cleanNotes = cleanNotesForSummary(newNotes);

  if (cleanNotes.length === 0) {
    return {
      text:
        previousCalibration ||
        "Todavía no hay ideas nuevas suficientes para calibrar la memoria.",
      noteIds: [],
    };
  }

  const notesText = cleanNotes
    .map((note) => {
      return `${note.index}. Proyecto: ${note.project}
Idea: ${note.text}`;
    })
    .join("\n\n")
    .slice(0, 9000);

  const prompt = `Estás actualizando una memoria viva llamada "Calibrando".

Esta memoria no es un resumen diario. Es una visión acumulada hasta hoy de mis proyectos, ideas, decisiones y próximos pasos.

Resumen anterior de Calibrando:
${previousCalibration || "Todavía no existe una calibración anterior."}

Ideas nuevas a integrar:
${notesText}

Actualiza "Calibrando" siguiendo este formato:

Calibrando

Estado general:
[visión breve de dónde estoy ahora]

Proyectos activos:
- [Proyecto]&#58; [estado actual, idea importante o avance]

Decisiones tomadas:
- [decisiones claras si las hay]

Ideas importantes:
- [ideas que siguen teniendo valor]

Próximos pasos:
1. [acción concreta]
2. [acción concreta]
3. [acción concreta]

Reglas:
- Integra solo lo nuevo que aporte valor.
- Conserva lo importante del resumen anterior.
- Elimina repeticiones.
- No inventes información.
- Sé claro, directo y conciso.
- No hagas un texto largo.
- Máximo 25 líneas.`;

  const analysis = await analyzeTextIdea(prompt, []);

  const calibrationText =
    analysis?.summary ||
    analysis?.resumen ||
    analysis?.text ||
    analysis?.response ||
    "No se pudo actualizar Calibrando con claridad.";

  return {
    text: calibrationText,
    analysis,
    noteIds: cleanNotes.map((note) => note.id).filter(Boolean),
  };
}