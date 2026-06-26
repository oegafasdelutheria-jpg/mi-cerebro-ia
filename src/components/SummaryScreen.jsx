import { getMemoryOverview } from "../engine/brainEngine";

function SummaryScreen({ data, setScreen }) {
  const overview = getMemoryOverview(data.memory);

  return (
    <main className="app">
      <button className="back" onClick={() => setScreen("home")}>
        ← Volver
      </button>

      <section className="panel">
        <h1>📋 Resumen</h1>

        <p>
          Ideas guardadas: <strong>{data.notes.length}</strong>
        </p>

        <p>
          Recordatorios guardados: <strong>{data.reminders.length}</strong>
        </p>

        <h2>Memoria por proyecto</h2>

        {overview.projects.length === 0 ? (
          <p>Todavía no hay memoria por proyecto.</p>
        ) : (
          <div className="list">
            {overview.projects.map((project) => (
              <article className="card" key={project.name}>
                <h3>{project.name}</h3>
                <p>
                  Ideas: <strong>{project.notesCount}</strong>
                </p>

                {project.summaries?.length > 0 && (
                  <>
                    <p>
                      <strong>Últimos resúmenes:</strong>
                    </p>
                    <ul>
                      {project.summaries.slice(0, 3).map((summary, index) => (
                        <li key={index}>{summary}</li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
            ))}
          </div>
        )}

        <h2>Conceptos frecuentes</h2>

        {overview.concepts.length === 0 ? (
          <p>Todavía no hay conceptos frecuentes.</p>
        ) : (
          <div className="list">
            {overview.concepts.slice(0, 10).map((concept) => (
              <article className="card" key={concept.name}>
                <p>
                  <strong>{concept.name}</strong> — {concept.count} menciones
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default SummaryScreen;