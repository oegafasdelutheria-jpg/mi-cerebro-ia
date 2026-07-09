import { useEffect, useState } from "react";
import { deleteNote, loadData } from "../services/storage";

function safeDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no válida";
  }

  return date.toLocaleString();
}

function IdeasScreen({ data, setData, setScreen }) {
  const initialNotes = Array.isArray(data?.notes) ? data.notes : [];
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    const updatedNotes = Array.isArray(data?.notes) ? data.notes : [];
    setNotes(updatedNotes);
  }, [data?.notes]);

  function handleDeleteNote(note) {
    if (!note?.id) {
      alert("No se puede borrar esta idea porque no tiene identificador.");
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que quieres borrar esta idea? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    try {
      const updatedNotes = deleteNote(note.id);

      setNotes(updatedNotes);

      if (typeof setData === "function") {
        setData(loadData());
      }
    } catch (error) {
      console.error("Error borrando idea:", error);
      alert("No se pudo borrar la idea.");
    }
  }

  return (
    <main className="app">
      <button className="back" onClick={() => setScreen("home")}>
        ← Volver
      </button>

      <section className="panel">
        <h1>🧠 Revisar ideas</h1>

        {notes.length === 0 ? (
          <p>Todavía no has guardado ideas.</p>
        ) : (
          <div className="list">
            {notes.map((note, index) => {
              const analysis = note?.analysis || null;

              return (
                <article className="card" key={note?.id || index}>
                  <small>{safeDate(note?.createdAt)}</small>

                  <p>{note?.text || "Idea sin texto"}</p>

                  {analysis && (
                    <>
                      <p>
                        <strong>Resumen:</strong>{" "}
                        {analysis.summary || "Sin resumen"}
                      </p>

                      <p>
                        <strong>Proyecto:</strong>{" "}
                        {analysis.project || "Sin proyecto"}
                      </p>
                    </>
                  )}

                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDeleteNote(note)}
                  >
                    Borrar idea
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default IdeasScreen;