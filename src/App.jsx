import { useEffect, useState } from "react";
import "./App.css";

import Home from "./components/Home";
import VoiceIdea from "./components/VoiceIdea";
import ReminderScreen from "./components/ReminderScreen";
import IdeasScreen from "./components/IdeasScreen";
import SummaryScreen from "./components/SummaryScreen";

import { createNote, createReminder, loadData, saveData } from "./services/storage";
import { updateMemoryWithNote } from "./engine/brainEngine";

function App() {
  const [screen, setScreen] = useState("home");
  const [data, setData] = useState(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  function handleSaveNote(noteInput) {
    const newNote = createNote(noteInput);
    const updatedMemory = updateMemoryWithNote(data.memory, newNote);

    setData((current) => ({
      ...current,
      notes: [newNote, ...current.notes],
      memory: updatedMemory,
    }));
  }

  function handleSaveReminder(reminderInput) {
    const newReminder = createReminder(reminderInput);

    setData((current) => ({
      ...current,
      reminders: [newReminder, ...current.reminders],
    }));
  }

  if (screen === "hablar") {
    return (
      <VoiceIdea
        data={data}
        onSaveNote={handleSaveNote}
        setScreen={setScreen}
      />
    );
  }

  if (screen === "recordatorio") {
    return (
      <ReminderScreen
        data={data}
        onSaveReminder={handleSaveReminder}
        setScreen={setScreen}
      />
    );
  }

  if (screen === "ideas") {
    return <IdeasScreen data={data} setScreen={setScreen} />;
  }

  if (screen === "resumen") {
    return <SummaryScreen data={data} setScreen={setScreen} />;
  }

  return <Home data={data} setScreen={setScreen} />;
}

export default App;