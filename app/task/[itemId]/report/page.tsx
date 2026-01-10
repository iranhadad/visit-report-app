"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";

const MAKE_WEBHOOK_URL =
  "https://hook.eu2.make.com/jylbsnfkjwvonynpl20mmmfel2ziljqp";

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const itemId = params.itemId as string;

  const projectId = searchParams.get("projectId");
  const technicianId = searchParams.get("technicianId");
  const projectName = searchParams.get("projectName");
  const itemName = searchParams.get("itemName");

  // שדות טופס
  const [date, setDate] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Done");
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  function resetForm() {
    setDate("");
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
     🟢 מסך הצלחה
  -------------------------------------------------- */
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow p-8 w-full max-w-md text-center space-y-6">
          <div className="text-green-700 text-xl font-bold">
            ✔ הדיווח בוצע בהצלחה
          </div>

          <div className="space-y-3">
            {/* דיווח חדש */}
            <button
              onClick={() => setSubmitSuccess(false)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
            >
              בצע דיווח חדש
            </button>

            {/* חזרה למסך משימות בפרויקט */}
            {projectId && technicianId && (
              <button
                onClick={() =>
                  router.push(
                    `/project/${projectId}?technicianId=${technicianId}`
                  )
                }
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                עבור למסך משימות
              </button>
            )}

            {/* מסך פרויקטים */}
            <button
              onClick={() => router.push("/")}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300"
            >
              עבור למסך פרויקטים
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------
     🧾 טופס דיווח רגיל
  -------------------------------------------------- */
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-2">דיווח ביצוע</h1>

      {(projectName || itemName) && (
        <div className="text-center mb-6 text-gray-700">
          {projectName && (
            <div className="text-sm">
              <strong>פרויקט:</strong> {projectName}
            </div>
          )}
          {itemName && (
            <div className="text-sm">
              <strong>משימה:</strong> {itemName}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 text-center font-medium text-red-700 bg-red-100 rounded py-2">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" required />
        <input type="text" placeholder="בניין" value={building} onChange={(e) => setBuilding(e.target.value)} className="form-input" />
        <input type="text" placeholder="קומה" value={floor} onChange={(e) => setFloor(e.target.value)} className="form-input" />
        <input type="text" placeholder="דירה" value={apartment} onChange={(e) => setApartment(e.target.value)} className="form-input" />
        <input type="text" placeholder="תיאור מיקום" value={location} onChange={(e) => setLocation(e.target.value)} className="form-input" />
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
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="form-input"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "שולח..." : "שליחת דיווח"}
        </button>
      </form>
    </div>
  );
}
