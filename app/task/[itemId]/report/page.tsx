"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWork } from "@/app/context/WorkContext";

const MAKE_WEBHOOK_URL =
  "https://hook.eu2.make.com/jylbsnfkjwvonynpl20mmmfel2ziljqp";

const PROJECT_ID_STORAGE_KEY = "last-project-id";

export default function ReportPage() {
  const router = useRouter();
  const { work } = useWork();

  /* -------------------------------------------------
     ✅ Hooks תמיד למעלה
  -------------------------------------------------- */
  const [date, setDate] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Done");
  const [file, setFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* -------------------------------------------------
     🛡️ Guard + שמירת projectId ל־fallback
  -------------------------------------------------- */
  useEffect(() => {
    if (!work.task || !work.project || !work.technician) {
      router.replace("/");
      return;
    }

    // ⬅️ שמירת projectId לניווט עתידי (גם אחרי refresh)
    sessionStorage.setItem(
      PROJECT_ID_STORAGE_KEY,
      work.project.id
    );

    if (!date) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
    }
  }, [work, router, date]);

  /* -------------------------------------------------
     ⛔ אין Context – לא מציג UI
  -------------------------------------------------- */
  if (!work.task || !work.project || !work.technician) {
    return null;
  }

  const itemId = work.task.id;

  function resetForm() {
    setBuilding("");
    setFloor("");
    setApartment("");
    setLocation("");
    setNotes("");
    setStatus("Done");
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("parentItemId", itemId);
    formData.append("date", date);
    formData.append("building", building);
    formData.append("floor", floor);
    formData.append("apartment", apartment);
    formData.append("location", location);
    formData.append("notes", notes);
    formData.append("status", status);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg("❌ שגיאה: " + data.error);
        return;
      }

      if (file) {
        const makeForm = new FormData();
        makeForm.append("subitemId", data.subitemId);
        makeForm.append("file", file);

        await fetch(MAKE_WEBHOOK_URL, {
          method: "POST",
          body: makeForm,
        });
      }

      resetForm();
      setSubmitSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ שגיאת רשת בשליחת הדיווח");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* -------------------------------------------------
     🟢 מסך הצלחה (עם ניווט יציב)
  -------------------------------------------------- */
  if (submitSuccess) {
    const projectId =
      work.project?.id ||
      sessionStorage.getItem(PROJECT_ID_STORAGE_KEY);

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-md text-center space-y-6">
          <div className="text-green-700 text-xl font-bold">
            ✔ הדיווח בוצע בהצלחה
          </div>

          <button
            onClick={() => setSubmitSuccess(false)}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
          >
            בצע דיווח נוסף
          </button>

          {projectId && (
            <button
              onClick={() =>
                router.push(`/project/${projectId}`)
              }
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
            >
              חזרה למשימות
            </button>
          )}

          <button
            onClick={() => router.push("/")}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold"
          >
            מסך פרויקטים
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------
     🧾 טופס דיווח
  -------------------------------------------------- */
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-2">
        דיווח ביצוע
      </h1>

      <div className="text-center mb-6">
        <div className="font-semibold">
          פרויקט: {work.project.name}
        </div>
        <div className="text-sm text-gray-600">
          משימה: {work.task.name}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 text-red-700 bg-red-100 rounded py-2 text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" required />
        <input placeholder="בניין" value={building} onChange={(e) => setBuilding(e.target.value)} className="form-input" />
        <input placeholder="קומה" value={floor} onChange={(e) => setFloor(e.target.value)} className="form-input" />
        <input placeholder="דירה" value={apartment} onChange={(e) => setApartment(e.target.value)} className="form-input" />
        <input placeholder="תיאור מיקום" value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" />
        <textarea placeholder="הערות" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" />

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input">
          <option value="Done">בוצע</option>
          <option value="Stuck">בעיה</option>
        </select>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="form-input"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {isSubmitting ? "שולח..." : "שליחת דיווח"}
        </button>
      </form>
    </div>
  );
}
