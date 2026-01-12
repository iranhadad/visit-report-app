"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useWork } from "@/app/context/WorkContext";

interface TaskItem {
  itemId: string;
  serviceName: string;
  required: number;
  done: number;
  remaining: number;
}

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { work, setProject, setTechnician, setTask } = useWork();

  const projectId = params.projectId as string;
  const projectName =
    searchParams.get("projectName") || `פרויקט ${projectId}`;
  const technicianId = searchParams.get("technicianId");

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 מונע אתחול Context כפול
  const contextInitialized = useRef(false);

  const today = new Date().toISOString().slice(0, 10);

  /* --------------------------------
     1️⃣ טעינת משימות (FETCH בלבד)
  --------------------------------- */
  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch(`/api/project/${projectId}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load project tasks", err);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  /* --------------------------------
     2️⃣ אתחול Context – פעם אחת בלבד
  --------------------------------- */
  useEffect(() => {
    if (contextInitialized.current) return;
    if (!projectId) return;

    console.log("🧠 Initializing WorkContext from ProjectPage");

    setProject({
      id: projectId,
      name: projectName,
    });

    if (technicianId) {
      setTechnician({ id: technicianId });
    }

    contextInitialized.current = true;
  }, [projectId, projectName, technicianId, setProject, setTechnician]);

  /* --------------------------------
     כניסה למשימה
  --------------------------------- */
  function enterTask(task: TaskItem) {
    setTask({
      id: task.itemId,
      name: task.serviceName,
    });

    router.push(`/task/${task.itemId}/report`);
  }

  /* --------------------------------
     סיום יום עבודה
  --------------------------------- */
  function goToDailySummary() {
    if (tasks.length === 0) {
      alert("אין משימות בפרויקט");
      return;
    }

    const entryTask = tasks[0];

    setTask({
      id: entryTask.itemId,
      name: entryTask.serviceName,
    });

    router.push(`/task/${entryTask.itemId}/summary?date=${today}`);
  }

  if (loading) {
    return (
      <main className="p-6 text-center text-gray-500">
        טוען שירותים…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 space-y-6">
      <h1 className="text-2xl font-bold text-right">
        {projectName}
      </h1>

      {tasks.length > 0 && (
        <button
          onClick={goToDailySummary}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700"
        >
          סיום יום עבודה – סיכום וחתימות
        </button>
      )}

      <div className="space-y-6">
        {tasks.map((task) => (
          <div
            key={task.itemId}
            className="bg-white rounded-lg shadow p-4"
          >
            <h2 className="text-lg font-semibold mb-4 text-right">
              {task.serviceName}
            </h2>

            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-sm text-gray-500">נדרש</div>
                <div className="text-lg font-bold">
                  {task.required}
                </div>
              </div>

              <div className="bg-gray-50 rounded p-2">
                <div className="text-sm text-gray-500">בוצע</div>
                <div className="text-lg font-bold">
                  {task.done}
                </div>
              </div>

              <div className="bg-gray-50 rounded p-2">
                <div className="text-sm text-gray-500">נותר</div>
                <div className="text-lg font-bold text-red-600">
                  {task.remaining}
                </div>
              </div>
            </div>

            <button
              onClick={() => enterTask(task)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              כניסה למשימה
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center text-gray-500">
            אין שירותים בפרויקט זה
          </div>
        )}
      </div>
    </main>
  );
}
