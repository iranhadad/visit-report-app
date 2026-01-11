"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

/* ---------- Types ---------- */

export type Project = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  name: string;
};

export type Technician = {
  id: string;
  name?: string;
};

type WorkState = {
  project?: Project;
  task?: Task;
  technician?: Technician;
  date?: string; // ✅ חדש
};

type WorkContextType = {
  work: WorkState;
  setProject: (p: Project) => void;
  setTask: (t: Task) => void;
  setTechnician: (t: Technician) => void;
  setDate: (date: string) => void; // ✅ חדש
  clearWork: () => void;
};

/* ---------- Context ---------- */

const WorkContext = createContext<WorkContextType | null>(null);

/* ---------- Provider ---------- */

const STORAGE_KEY = "work-context";

export function WorkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [work, setWork] = useState<WorkState>({});

  /* 🔁 Restore from sessionStorage */
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setWork(JSON.parse(stored));
    }
  }, []);

  /* 💾 Persist on change */
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(work));
  }, [work]);

  const setProject = (project: Project) =>
    setWork((prev) => ({ ...prev, project }));

  const setTask = (task: Task) =>
    setWork((prev) => ({ ...prev, task }));

  const setTechnician = (technician: Technician) =>
    setWork((prev) => ({ ...prev, technician }));

  const setDate = (date: string) =>
    setWork((prev) => ({ ...prev, date }));

  const clearWork = () => {
    setWork({});
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WorkContext.Provider
      value={{
        work,
        setProject,
        setTask,
        setTechnician,
        setDate,
        clearWork,
      }}
    >
      {children}
    </WorkContext.Provider>
  );
}

/* ---------- Hook ---------- */

export function useWork() {
  const ctx = useContext(WorkContext);
  if (!ctx) {
    throw new Error("useWork must be used within WorkProvider");
  }
  return ctx;
}
