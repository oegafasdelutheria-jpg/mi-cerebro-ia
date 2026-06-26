const API_BASE_URL = "http://localhost:3001";

export const TRANSCRIBE_URL = `${API_BASE_URL}/transcribe`;
export const ANALYZE_URL = `${API_BASE_URL}/analyze`;
export const REMINDER_URL = `${API_BASE_URL}/parse-reminder`;

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