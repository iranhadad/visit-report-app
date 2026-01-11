"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWork } from "@/app/context/WorkContext";

interface TaskDetails {
  itemId: string;
  serviceName: string;
  required: number;
  done: number;
  remaining: number;
  projectId?: string;
  projectName?: string;
  technicianId?: string;
}

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const { setTask, setProject, setTechnician } = useWork();

  const itemId = params.itemId as string;

  const [task, setTaskData] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  /* -------------------------------------------------
     📡 שליפת משימה + הזנת Context
  -------------------------------------------------- */
  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/task/${itemId}`);
        const data: TaskDetails | null = await res.json();

        if (!data) {
          setTaskData(null);
          return;
        }

        setTaskData(data);

        // Context = מקור האמת לניווט
        setTask({
          id: data.itemId,
          name: data.serviceName,
        });

        if (data.projectId && data.projectName) {
          setProject({
            id: data.projectId,
            name: data.projectName,
          });
        }

        if (data.technicianId) {
          setTechnician({
            id: data.technicianId,
          });
        }
      } catch (err) {
        console.error("Failed to load task", err);
        setTaskData(null);
      } finally {
        setLoading(false);
      }
    }

    if (itemId) {
      fetchTask();
    }
  }, [itemId, setTask, setProject, setTechnician]);

  /* -------------------------------------------------
     🟡 מצבי ביניים
  -------------------------------------------------- */
  if (loading) {
    return (
      <main className="p-6 text-center text-gray-500">
        טוען נתוני משימה…
      </main>
    );
  }

  if (!task) {
    return (
      <main className="p-6 text-center text-red-500">
        המשימה לא נמצאה
      </main>
    );
  }

  /* -------------------------------------------------
     ✅ ניווטים בטוחים (TypeScript-safe)
  -------------------------------------------------- */
  function goToSummary() {
    if (!task) return;

    router.push(`/task/${task.itemId}/summary?date=${today}`);
  }

  function goToReport() {
    if (!task) return;

    router.push(`/task/${task.itemId}/report`);
  }

  const canGoToSummary =
    Boolean(task.projectId) && Boolean(task.technicianId);

  /* -------------------------------------------------
     🧾 UI
  -------------------------------------------------- */
  return (
    <main className="min-h-screen bg-gray-100 p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        {task.serviceName}
      </h1>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-500">נדרש</div>
            <div className="text-xl font-bold">{task.required}</div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-500">בוצע</div>
            <div className="text-xl font-bold">{task.done}</div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-500">נותר</div>
            <div className="text-xl font-bold text-red-600">
              {task.remaining}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={goToReport}
          disabled={task.remaining <= 0}
          className={`w-full py-4 rounded-lg text-lg font-semibold transition
            ${
              task.remaining > 0
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-400 text-white cursor-not-allowed"
            }`}
        >
          {task.remaining > 0
            ? "מעבר לדיווח ביצוע"
            : "המשימה הושלמה"}
        </button>

        {canGoToSummary && (
          <button
            onClick={goToSummary}
            className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-700"
          >
            מעבר לסיכום יומי וחתימות
          </button>
        )}
      </div>
    </main>
  );
}
