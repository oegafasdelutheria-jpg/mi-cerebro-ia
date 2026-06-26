function IdeasScreen({ data, setScreen }) {
  return (
    <main className="app">
      <button className="back" onClick={() => setScreen("home")}>
        ← Volver
      </button>

      <section className="panel">
        <h1>🧠 Revisar ideas</h1>

        {data.notes.length === 0 ? (
          <p>Todavía no has guardado ideas.</p>
        ) : (
          <div className="list">
            {data.notes.map((note) => (
              <article className="card" key={note.id}>
                <small>{new Date(note.createdAt).toLocaleString()}</small>
                <p>{note.text}</p>

                {note.analysis && (
                  <>
                    <p>
                      <strong>Resumen:</strong> {note.analysis.summary}
                    </p>
                    <p>
                      <strong>Proyecto:</strong> {note.analysis.project}
                    </p>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default IdeasScreen;