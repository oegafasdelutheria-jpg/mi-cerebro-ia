import { useState } from "react";
import { parseReminderText } from "../services/api";

function ReminderScreen({ data, onSaveReminder, setScreen }) {
  const [reminderText, setReminderText] = useState("");
  const [parsedReminder, setParsedReminder] = useState(null);
  const [isParsingReminder, setIsParsingReminder] = useState(false);

  async function parseReminder() {
    if (!reminderText.trim()) {
      alert("Escribe un recordatorio.");
      return;
    }

    try {
      setIsParsingReminder(true);
      const reminder = await parseReminderText(reminderText);
      setParsedReminder(reminder);
    } catch (error) {
      alert("Error interpretando recordatorio: " + error.message);
      console.error(error);
    } finally {
      setIsParsingReminder(false);
    }
  }

  function saveReminder() {
    onSaveReminder({
      originalText: reminderText,
      parsedReminder,
    });

    setScreen("home");
  }

  return (
    <main className="app">
      <button className="back" onClick={() => setScreen("home")}>
        ← Volver
      </button>

      <section className="panel">
        <h1>📅 Recordatorio</h1>
        <p>Escribe algo como: viernes que viene a las 9 llamar a Marta.</p>

        <input
          placeholder="Ej: viernes que viene 9:00 llamar a Marta"
          value={reminderText}
          onChange={(event) => {
            setReminderText(event.target.value);
            setParsedReminder(null);
          }}
        />

        <button className="action" onClick={parseReminder}>
          {isParsingReminder ? "Interpretando..." : "Interpretar recordatorio"}
        </button>

        {parsedReminder && (
          <div className="card">
            <h3>🧠 Recordatorio detectado</h3>

            <p>
              <strong>Título:</strong> {parsedReminder.title}
            </p>

            <p>
              <strong>Descripción:</strong> {parsedReminder.description}
            </p>

            <p>
              <strong>Fecha:</strong> {parsedReminder.dateTime}
            </p>

            <p>
              <strong>Aviso previo:</strong>{" "}
              {parsedReminder.notifyMinutesBefore} minutos
            </p>
          </div>
        )}

        <button className="action primary" onClick={saveReminder}>
          Guardar recordatorio
        </button>

        <h2>Guardados</h2>

        {data.reminders.length === 0 ? (
          <p>No tienes recordatorios guardados.</p>
        ) : (
          <div className="list">
            {data.reminders.map((reminder) => (
              <article className="card" key={reminder.id}>
                <small>{new Date(reminder.createdAt).toLocaleString()}</small>
                <p>
                  <strong>{reminder.title || reminder.text}</strong>
                </p>
                {reminder.dateTime && (
                  <p>{new Date(reminder.dateTime).toLocaleString()}</p>
                )}
                {reminder.description && <p>{reminder.description}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default ReminderScreen;