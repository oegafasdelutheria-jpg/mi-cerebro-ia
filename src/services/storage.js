export const STORAGE_KEY = "mi-cerebro-data-v1";

const LEGACY_NOTES_KEY = "notes";
const LEGACY_DAILY_SUMMARIES_KEY = "dailySummaries";

export const initialData = {
  notes: [],
  reminders: [],
  dailySummaries: [],
  calibration: {
    text: "",
    updatedAt: null,
    processedNoteIds: [],
  },
  memory: {
    projects: {},
    concepts: {},
  },
};

function createId(prefix = "id") {
  try {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // fallback
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeParseJSON(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readLegacyArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = safeParseJSON(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanNote(note) {
  if (!note || typeof note !== "object") return null;

  return {
    ...note,
    id: note.id || createId("note"),
    text:
      typeof note.text === "string" && note.text.trim()
        ? note.text.trim()
        : "Idea sin texto",

    // Importante:
    // No guardamos audio base64 en localStorage.
    // Si una nota antigua lo tenía, aquí lo eliminamos.
    hasAudio: Boolean(note.hasAudio || note.audioData),
    audioData: null,
    audioMimeType: note.audioMimeType || null,

    analysis: note.analysis || null,
    createdAt: note.createdAt || note.date || new Date().toISOString(),
  };
}

function cleanReminder(reminder) {
  if (!reminder || typeof reminder !== "object") return null;

  return {
    ...reminder,
    id: reminder.id || createId("reminder"),
    text: reminder.text || "",
    title: reminder.title || "Recordatorio",
    description: reminder.description || "",
    dateTime: reminder.dateTime || null,
    notifyMinutesBefore: reminder.notifyMinutesBefore || 5,
    createdAt: reminder.createdAt || new Date().toISOString(),
  };
}

function cleanDailySummary(summary) {
  if (!summary || typeof summary !== "object") return null;

  const date = summary.date || new Date().toISOString().slice(0, 10);

  return {
    id: summary.id || `summary_${date}`,
    date,
    title: summary.title || "Resumen diario",
    text: summary.text || "",
    noteIds: Array.isArray(summary.noteIds) ? summary.noteIds : [],
    createdAt: summary.createdAt || new Date().toISOString(),
    updatedAt: summary.updatedAt || new Date().toISOString(),
  };
}

function cleanCalibration(calibration) {
  return {
    text:
      typeof calibration?.text === "string"
        ? calibration.text
        : "",

    updatedAt: calibration?.updatedAt || null,

    processedNoteIds: Array.isArray(calibration?.processedNoteIds)
      ? calibration.processedNoteIds
      : [],
  };
}

export function normalizeData(data) {
  const notes = Array.isArray(data?.notes)
    ? data.notes.map(cleanNote).filter(Boolean)
    : [];

  const reminders = Array.isArray(data?.reminders)
    ? data.reminders.map(cleanReminder).filter(Boolean)
    : [];

  const dailySummaries = Array.isArray(data?.dailySummaries)
    ? data.dailySummaries.map(cleanDailySummary).filter(Boolean)
    : [];

  return {
    notes,
    reminders,
    dailySummaries,
    calibration: cleanCalibration(data?.calibration),
    memory: {
      projects:
        data?.memory?.projects && typeof data.memory.projects === "object"
          ? data.memory.projects
          : {},

      concepts:
        data?.memory?.concepts && typeof data.memory.concepts === "object"
          ? data.memory.concepts
          : {},
    },
  };
}

export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    const data = saved
      ? normalizeData(safeParseJSON(saved, initialData))
      : normalizeData(initialData);

    const legacyNotes = readLegacyArray(LEGACY_NOTES_KEY);
    const legacyDailySummaries = readLegacyArray(LEGACY_DAILY_SUMMARIES_KEY);

    const shouldImportLegacyNotes =
      data.notes.length === 0 && legacyNotes.length > 0;

    const shouldImportLegacyDailySummaries =
      data.dailySummaries.length === 0 && legacyDailySummaries.length > 0;

    const migratedData = normalizeData({
      ...data,
      notes: shouldImportLegacyNotes ? legacyNotes : data.notes,
      dailySummaries: shouldImportLegacyDailySummaries
        ? legacyDailySummaries
        : data.dailySummaries,
    });

    // Guardamos una versión limpia, sin audios base64 antiguos.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData));
    } catch (error) {
      console.error("No se pudo limpiar el almacenamiento:", error);
    }

    return migratedData;
  } catch (error) {
    console.error("No se pudo cargar la información:", error);
    return normalizeData(initialData);
  }
}

export function saveData(data) {
  const cleanData = normalizeData(data);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));

    const savedAgain = localStorage.getItem(STORAGE_KEY);
    const parsedAgain = normalizeData(safeParseJSON(savedAgain, initialData));

    if (parsedAgain.notes.length !== cleanData.notes.length) {
      console.warn("El guardado no parece haberse persistido correctamente.");
    }

    return true;
  } catch (error) {
    console.error("No se pudo guardar la información:", error);

    try {
      const emergencyData = {
        ...cleanData,
        notes: cleanData.notes.map((note) => ({
          ...note,
          audioData: null,
          audioMimeType: null,
        })),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyData));
      return true;
    } catch (secondError) {
      console.error("Segundo intento de guardado falló:", secondError);
      return false;
    }
  }
}

export function createNote({ text, audioData, audioMimeType, analysis }) {
  return cleanNote({
    id: createId("note"),
    text: text?.trim() || "Audio sin texto todavía",

    // Marcamos que venía de audio, pero NO guardamos el audio.
    hasAudio: Boolean(audioData),
    audioData: null,
    audioMimeType: audioMimeType || null,

    analysis: analysis || null,
    createdAt: new Date().toISOString(),
  });
}

export function createReminder({ originalText, parsedReminder }) {
  const source = parsedReminder || {
    title: originalText?.trim(),
    description: originalText?.trim(),
    dateTime: null,
    notifyMinutesBefore: 5,
  };

  return cleanReminder({
    id: createId("reminder"),
    text: originalText?.trim() || "",
    title: source.title || originalText?.trim() || "Recordatorio",
    description: source.description || "",
    dateTime: source.dateTime || null,
    notifyMinutesBefore: source.notifyMinutesBefore || 5,
    createdAt: new Date().toISOString(),
  });
}

export function getDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(today.getDate()).padStart(2, "0")}`;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getNoteDate(note) {
  return (
    note?.createdAt ||
    note?.date ||
    note?.savedAt ||
    note?.timestamp ||
    new Date().toISOString()
  );
}

function getNoteText(note) {
  return (
    note?.text ||
    note?.transcription ||
    note?.transcript ||
    note?.content ||
    note?.analysis?.summary ||
    "Idea sin texto"
  );
}

function getNoteProject(note) {
  return (
    note?.analysis?.project ||
    note?.project ||
    note?.analysis?.proyecto ||
    "Sin proyecto"
  );
}

export function getNotes() {
  return loadData().notes;
}

export function deleteNote(noteId) {
  if (!noteId) {
    return getNotes();
  }

  const data = loadData();

  const updatedNotes = data.notes.filter((note) => note?.id !== noteId);

  const updatedData = {
    ...data,
    notes: updatedNotes,
  };

  saveData(updatedData);

  return updatedNotes;
}

export function deleteNotes(noteIds = []) {
  if (!Array.isArray(noteIds) || noteIds.length === 0) {
    return getNotes();
  }

  const data = loadData();
  const idsToDelete = new Set(noteIds);

  const updatedNotes = data.notes.filter((note) => !idsToDelete.has(note?.id));

  const updatedData = {
    ...data,
    notes: updatedNotes,
  };

  saveData(updatedData);

  return updatedNotes;
}

export function deleteReminder(reminderId) {
  if (!reminderId) {
    return loadData().reminders;
  }

  const data = loadData();

  const updatedReminders = data.reminders.filter(
    (reminder) => reminder?.id !== reminderId
  );

  const updatedData = {
    ...data,
    reminders: updatedReminders,
  };

  saveData(updatedData);

  return updatedReminders;
}

export function deleteReminders(reminderIds = []) {
  if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
    return loadData().reminders;
  }

  const data = loadData();
  const idsToDelete = new Set(reminderIds);

  const updatedReminders = data.reminders.filter(
    (reminder) => !idsToDelete.has(reminder?.id)
  );

  const updatedData = {
    ...data,
    reminders: updatedReminders,
  };

  saveData(updatedData);

  return updatedReminders;
}

export function getNotesByDate(dateKey = getDateKey()) {
  const notes = getNotes();

  return notes.filter((note) => {
    const noteDateKey = getDateKey(getNoteDate(note));
    return noteDateKey === dateKey;
  });
}

export function getTodayNotes() {
  return getNotesByDate(getDateKey());
}

export function getDailySummaries() {
  return loadData().dailySummaries;
}

export function getDailySummary(dateKey = getDateKey()) {
  const summaries = getDailySummaries();
  return summaries.find((summary) => summary?.date === dateKey) || null;
}

export function saveDailySummary(summary) {
  if (!summary || !summary.date) return null;

  const data = loadData();

  const summaries = Array.isArray(data.dailySummaries)
    ? data.dailySummaries
    : [];

  const cleanSummary = cleanDailySummary({
    id: summary.id || `summary_${summary.date}`,
    date: summary.date,
    title: summary.title || "Resumen diario",
    text: summary.text || "",
    noteIds: Array.isArray(summary.noteIds) ? summary.noteIds : [],
    createdAt: summary.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const existingIndex = summaries.findIndex(
    (item) => item?.date === cleanSummary.date
  );

  let updatedSummaries;

  if (existingIndex >= 0) {
    updatedSummaries = summaries.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            ...cleanSummary,
          }
        : item
    );
  } else {
    updatedSummaries = [...summaries, cleanSummary];
  }

  const updatedData = {
    ...data,
    dailySummaries: updatedSummaries,
  };

  saveData(updatedData);

  return cleanSummary;
}

export function buildBasicDailySummary(notes = []) {
  const validNotes = Array.isArray(notes) ? notes.filter(Boolean) : [];

  if (validNotes.length === 0) {
    return "Hoy todavía no hay ideas guardadas.";
  }

  const projects = {};

  validNotes.forEach((note) => {
    const project = getNoteProject(note);
    const text = getNoteText(note);

    if (!projects[project]) {
      projects[project] = [];
    }

    projects[project].push(text);
  });

  const projectBlocks = Object.entries(projects)
    .map(([project, projectNotes]) => {
      const ideas = projectNotes
        .map((text, index) => `${index + 1}. ${text}`)
        .join("\n");

      return `${project}\n${ideas}`;
    })
    .join("\n\n");

  return `Resumen del día

Hoy guardaste ${validNotes.length} idea${
    validNotes.length === 1 ? "" : "s"
  }.

Ideas por proyecto

${projectBlocks}

Próximos pasos

Revisar estas ideas y decidir cuáles se convierten en tareas, recordatorios o proyectos.`;
}

export function getCalibration() {
  const data = loadData();

  return data.calibration || {
    text: "",
    updatedAt: null,
    processedNoteIds: [],
  };
}

export function saveCalibration(calibration) {
  const data = loadData();

  const cleanCalibrationData = cleanCalibration({
    text: calibration?.text || "",
    updatedAt: calibration?.updatedAt || new Date().toISOString(),
    processedNoteIds: Array.isArray(calibration?.processedNoteIds)
      ? calibration.processedNoteIds
      : [],
  });

  const updatedData = {
    ...data,
    calibration: cleanCalibrationData,
  };

  saveData(updatedData);

  return cleanCalibrationData;
}

export function getUnprocessedNotesForCalibration() {
  const data = loadData();
  const calibration = data.calibration || {};
  const processedIds = new Set(calibration.processedNoteIds || []);

  return data.notes.filter((note) => {
    if (!note?.id) return false;
    return !processedIds.has(note.id);
  });
}