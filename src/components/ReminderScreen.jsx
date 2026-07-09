import { useEffect, useState } from "react";
import { parseReminderText } from "../services/api.js";
import { deleteReminder, getDateKey, loadData } from "../services/storage.js";

function safeDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no válida";
  }

  return date.toLocaleString();
}

function getReminderDateKey(reminder) {
  if (!reminder?.dateTime) return null;

  const date = new Date(reminder.dateTime);

  if (Number.isNaN(date.getTime())) return null;

  return getDateKey(date);
}

function formatDateKey(dateKey) {
  if (!dateKey) return "Sin fecha";

  const date = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function ReminderScreen({ data, setData, onSaveReminder, setScreen }) {
  const todayKey = getDateKey();

  const [reminderText, setReminderText] = useState("");
  const [parsedReminder, setParsedReminder] = useState(null);
  const [isParsingReminder, setIsParsingReminder] = useState(false);
  const [reminders, setReminders] = useState(
    Array.isArray(data?.reminders) ? data.reminders : []
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  useEffect(() => {
    setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
  }, [data?.reminders]);

  const remindersWithDate = reminders.filter((reminder) =>
    getReminderDateKey(reminder)
  );

  const todayReminders = remindersWithDate.filter(
    (reminder) => getReminderDateKey(reminder) === todayKey
  );

  const futureReminders = remindersWithDate.filter((reminder) => {
    const dateKey = getReminderDateKey(reminder);
    return dateKey && dateKey > todayKey;
  });

  const selectedDayReminders = remindersWithDate.filter(
    (reminder) => getReminderDateKey(reminder) === selectedDateKey
  );

  const reminderDays = Array.from(
    new Set(remindersWithDate.map((reminder) => getReminderDateKey(reminder)))
  ).sort();

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
    if (!reminderText.trim()) {
      alert("Escribe un recordatorio.");
      return;
    }

    if (!parsedReminder?.dateTime) {
      alert("Primero interpreta el recordatorio para detectar la fecha.");
      return;
    }

    onSaveReminder({
      originalText: reminderText,
      parsedReminder,
    });

    setScreen("home");
  }

  function handleDeleteReminder(reminder) {
    if (!reminder?.id) {
      alert("No se puede borrar este recordatorio porque no tiene identificador.");
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que quieres borrar este recordatorio?"
    );

    if (!confirmed) return;

    try {
      const updatedReminders = deleteReminder(reminder.id);

      setReminders(updatedReminders);

      if (typeof setData === "function") {
        setData(loadData());
      }
    } catch (error) {
      console.error("Error borrando recordatorio:", error);
      alert("No se pudo borrar el recordatorio.");
    }
  }

  function renderReminderCard(reminder) {
    return (
      <article className="card" key={reminder.id}>
        <small>Creado: {safeDate(reminder.createdAt)}</small>

        <p>
          <strong>{reminder.title || reminder.text || "Recordatorio"}</strong>
        </p>

        {reminder.dateTime && <p>📅 {safeDate(reminder.dateTime)}</p>}

        {reminder.description && <p>{reminder.description}</p>}

        <button
          type="button"
          className="danger"
          onClick={() => handleDeleteReminder(reminder)}
        >
          Borrar recordatorio
        </button>
      </article>
    );
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
              <strong>Fecha:</strong> {safeDate(parsedReminder.dateTime)}
            </p>

            <p>
              <strong>Aviso previo:</strong>{" "}
              {parsedReminder.notifyMinutesBefore || 5} minutos
            </p>
          </div>
        )}

        <button className="action primary" onClick={saveReminder}>
          Guardar recordatorio
        </button>

        <section className="card">
          <h2>Hoy</h2>

          <p>
            Recordatorios para hoy: <strong>{todayReminders.length}</strong>
          </p>

          <p>
            Recordatorios futuros guardados:{" "}
            <strong>{futureReminders.length}</strong>
          </p>

          {todayReminders.length === 0 ? (
            <p>No tienes recordatorios para hoy.</p>
          ) : (
            <div className="list">{todayReminders.map(renderReminderCard)}</div>
          )}
        </section>

        <h2>Calendario</h2>

        {reminderDays.length === 0 ? (
          <p>No tienes días con recordatorios guardados.</p>
        ) : (
          <div className="list">
            {reminderDays.map((dateKey) => {
              const count = remindersWithDate.filter(
                (reminder) => getReminderDateKey(reminder) === dateKey
              ).length;

              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;

              return (
                <button
                  type="button"
                  key={dateKey}
                  className={isSelected ? "action primary" : "action"}
                  onClick={() => setSelectedDateKey(dateKey)}
                >
                  🔴 {isToday ? "Hoy" : formatDateKey(dateKey)} · {count}
                </button>
              );
            })}
          </div>
        )}

        <section className="card">
          <h2>
            {selectedDateKey === todayKey
              ? "Recordatorios de hoy"
              : `Recordatorios del ${formatDateKey(selectedDateKey)}`}
          </h2>

          {selectedDayReminders.length === 0 ? (
            <p>No hay recordatorios para este día.</p>
          ) : (
            <div className="list">
              {selectedDayReminders.map(renderReminderCard)}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default ReminderScreen;