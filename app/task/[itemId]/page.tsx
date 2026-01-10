"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TaskDetails {
  itemId: string;
  serviceName: string;
  required: number;
  done: number;
  remaining: number;
  projectId?: string;
  technicianId?: string;
}

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // תאריך היום YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/task/${itemId}`);
        const data = await res.json();
        setTask(data);
      } catch (err) {
        console.error("Failed to load task", err);
      } finally {
        setLoading(false);
      }
    }

    if (itemId) {
      fetchTask();
    }
  }, [itemId]);

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

  function goToSummary() {
    if (!task) return;

    if (!task.projectId || !task.technicianId) return;
    
    router.push(
      `/task/${task.itemId}/summary?projectId=${task.projectId}&technicianId=${task.technicianId}&date=${today}`
    );
  }

  const canGoToSummary =
    Boolean(task.projectId) && Boolean(task.technicianId);

  return (
    <main className="min-h-screen bg-gray-100 p-6 space-y-6">
      {/* כותרת */}
      <h1 className="text-2xl font-bold">
        {task.serviceName}
      </h1>

      {/* כרטיס נתונים */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-500">נדרש</div>
            <div className="text-xl font-bold">
              {task.required}
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-500">בוצע</div>
            <div className="text-xl font-bold">
              {task.done}
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="text-sm text-gray-500">נותר</div>
            <div className="text-xl font-bold text-red-600">
              {task.remaining}
            </div>
          </div>
        </div>
      </div>

      {/* פעולות */}
      <div className="space-y-4">
        {/* מעבר לדיווח ביצוע */}
        <Link
          href={`/task/${task.itemId}/report`}
          className={`block w-full text-center py-4 rounded-lg text-lg font-semibold transition
            ${
              task.remaining > 0
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-400 text-white cursor-not-allowed"
            }`}
        >
          {task.remaining > 0
            ? "מעבר לדיווח ביצוע"
            : "המשימה הושלמה"}
        </Link>

        {/* סיכום יומי וחתימות */}
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
