export function normalizeProjectName(projectName) {
  if (!projectName) return "Sin clasificar";

  const clean = projectName.trim();

  const knownProjects = {
    "oë": "Oë",
    "oe": "Oë",
    "33": "33 Raw Elements",
    "33 raw elements": "33 Raw Elements",
    "la ruta artesana": "La Ruta Artesana",
    "ruta artesana": "La Ruta Artesana",
    "escuela de oficios": "Escuela de Oficios",
    "mi cerebro ia": "Mi Cerebro IA",
  };

  return knownProjects[clean.toLowerCase()] || clean;
}

export function updateMemoryWithNote(memory = {}, note) {
  const currentMemory = {
    projects: memory.projects || {},
    concepts: memory.concepts || {},
  };

  const projectName = normalizeProjectName(note.analysis?.project);
  const tags = note.analysis?.tags || [];

  const existingProject = currentMemory.projects[projectName] || {
    name: projectName,
    notesCount: 0,
    summaries: [],
    tags: {},
    lastUpdated: null,
  };

  const updatedProject = {
    ...existingProject,
    notesCount: existingProject.notesCount + 1,
    summaries: note.analysis?.summary
      ? [note.analysis.summary, ...existingProject.summaries].slice(0, 20)
      : existingProject.summaries,
    lastUpdated: new Date().toISOString(),
  };

  tags.forEach((tag) => {
    const key = tag.toLowerCase();
    updatedProject.tags[key] = (updatedProject.tags[key] || 0) + 1;

    const existingConcept = currentMemory.concepts[key] || {
      name: tag,
      count: 0,
      projects: {},
      lastMentioned: null,
    };

    currentMemory.concepts[key] = {
      ...existingConcept,
      count: existingConcept.count + 1,
      projects: {
        ...existingConcept.projects,
        [projectName]: (existingConcept.projects[projectName] || 0) + 1,
      },
      lastMentioned: new Date().toISOString(),
    };
  });

  currentMemory.projects[projectName] = updatedProject;

  return currentMemory;
}

export function getMemoryOverview(memory = {}) {
  const projects = Object.values(memory.projects || {});
  const concepts = Object.values(memory.concepts || {});

  return {
    projects: projects.sort((a, b) => b.notesCount - a.notesCount),
    concepts: concepts.sort((a, b) => b.count - a.count),
  };
}