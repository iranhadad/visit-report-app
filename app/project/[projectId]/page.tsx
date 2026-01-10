"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";

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

  const projectId = params.projectId as string;
  const technicianId = searchParams.get("technicianId");
  const projectName = searchParams.get("projectName"); // ✅ חדש

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // תאריך היום YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch(`/api/project/${projectId}`);
        const data = await res.json();
        setTasks(data);
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

  function goToDailySummary() {
    if (!technicianId) {
      alert("חסר technicianId");
      return;
    }

    if (tasks.length === 0) {
      alert("אין משימות בפרויקט");
      return;
    }

    // entry point טכני בלבד
    const entryItemId = tasks[0].itemId;

    router.push(
      `/task/${entryItemId}/summary` +
        `?projectId=${projectId}` +
        `&projectName=${encodeURIComponent(projectName ?? "")}` +
        `&technicianId=${technicianId}` +
        `&date=${today}`
    );
  }

  const canShowSummaryButton =
    Boolean(technicianId) && tasks.length > 0;

  if (loading) {
    return (
      <main className="p-6 text-center text-gray-500">
        טוען שירותים…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 space-y-6">
      {/* כותרת */}
      <h1 className="text-2xl font-bold text-right">
        {projectName || "שירותים בפרויקט"}
      </h1>

      {/* סיום יום עבודה */}
      {canShowSummaryButton && (
        <button
          onClick={goToDailySummary}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700"
        >
          סיום יום עבודה – סיכום וחתימות
        </button>
      )}

      {/* רשימת משימות */}
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

            <Link
              href={
                `/task/${task.itemId}/report` +
                `?projectId=${projectId}` +
                `&projectName=${encodeURIComponent(projectName ?? "")}` +
                `&technicianId=${technicianId}`
              }
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              כניסה למשימה
            </Link>
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
