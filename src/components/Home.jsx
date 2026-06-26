function Home({ data, setScreen }) {
  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">Mi Cerebro IA</p>
        <h1>¿Qué tienes en mente?</h1>
        <p className="subtitle">
          Habla, guarda ideas y deja que la IA te ayude a ordenar tu pensamiento.
        </p>
      </section>

      <section className="actions">
        <button className="action primary" onClick={() => setScreen("hablar")}>
          <span className="icon">🎤</span>
          <span>
            <strong>Hablar</strong>
            <small>Grabar una idea</small>
          </span>
        </button>

        <button className="action" onClick={() => setScreen("recordatorio")}>
          <span className="icon">📅</span>
          <span>
            <strong>Recordatorio</strong>
            <small>Crear cita o tarea</small>
          </span>
        </button>

        <button className="action" onClick={() => setScreen("ideas")}>
          <span className="icon">🧠</span>
          <span>
            <strong>Revisar ideas</strong>
            <small>Conectar pensamientos</small>
          </span>
        </button>

        <button className="action" onClick={() => setScreen("resumen")}>
          <span className="icon">📋</span>
          <span>
            <strong>Resumen de hoy</strong>
            <small>Ver acuerdos y próximos pasos</small>
          </span>
        </button>
      </section>

      <section className="today">
        <h2>Hoy</h2>
        <p>
          Ideas: <strong>{data.notes.length}</strong>
        </p>
        <p>
          Recordatorios: <strong>{data.reminders.length}</strong>
        </p>
      </section>
    </main>
  );
}

export default Home;