export const STORAGE_KEY = "mi-cerebro-data-v1";

export const initialData = {
  notes: [],
  reminders: [],
  memory: {
    projects: {},
    concepts: {},
  },
};

export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialData;
  } catch {
    return initialData;
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createNote({ text, audioData, audioMimeType, analysis }) {
  return {
    id: crypto.randomUUID(),
    text: text?.trim() || "Audio sin texto todavía",
    hasAudio: Boolean(audioData),
    audioData,
    audioMimeType,
    analysis,
    createdAt: new Date().toISOString(),
  };
}

export function createReminder({ originalText, parsedReminder }) {
  const source = parsedReminder || {
    title: originalText?.trim(),
    description: originalText?.trim(),
    dateTime: null,
    notifyMinutesBefore: 5,
  };

  return {
    id: crypto.randomUUID(),
    text: originalText?.trim() || "",
    title: source.title,
    description: source.description,
    dateTime: source.dateTime,
    notifyMinutesBefore: source.notifyMinutesBefore || 5,
    createdAt: new Date().toISOString(),
  };
}