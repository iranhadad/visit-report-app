"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useWork } from "@/app/context/WorkContext";

export default function VisitSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const { work, clearWork } = useWork();

  const itemId = params.itemId as string;

  const projectId = work.project?.id;
  const projectName = work.project?.name;
  const technicianId = work.technician?.id;
  const date = work.date;

  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [taskItemIds, setTaskItemIds] = useState<string[]>([]);

  const clientSigRef = useRef<SignatureCanvas>(null);
  const techSigRef = useRef<SignatureCanvas>(null);

  /* -------------------------------------------------
     🛡️ Guard – חייבים Context תקין
  -------------------------------------------------- */
  useEffect(() => {
    if (!projectId || !technicianId || !date || !itemId) {
      router.replace("/");
    }
  }, [projectId, technicianId, date, itemId, router]);

  /* -------------------------------------------------
     שליפת סיכום יומי – המשימות שבוצעו
  -------------------------------------------------- */
  useEffect(() => {
    if (!projectId || !technicianId || !date) return;

    fetch(
      `/api/visit-summary?projectId=${projectId}&technicianId=${technicianId}&date=${date}`
    )
      .then((res) => res.json())
      .then((data) => {
        const ids =
          data?.items?.map((item: any) => item.itemId) ?? [];
        setTaskItemIds(ids);
      })
      .catch((err) => {
        console.error("Failed to load visit summary", err);
      });
  }, [projectId, technicianId, date]);

  function clearClientSignature() {
    clientSigRef.current?.clear();
  }

  function clearTechSignature() {
    techSigRef.current?.clear();
  }

  async function handleConfirm() {
    const clientSignature = clientSigRef.current?.toDataURL();
    const technicianSignature = techSigRef.current?.toDataURL();

    if (!clientSignature || !technicianSignature) {
      alert("יש למלא את שתי החתימות");
      return;
    }

    if (!projectId || !technicianId || !date) {
      alert("חסרים נתוני ביקור");
      return;
    }

    if (taskItemIds.length === 0) {
      alert("לא נמצאו משימות לדוח זה");
      return;
    }

    try {
      setSubmitting(true);

      /* 1️⃣ יצירת סיכום ביקור */
      const createRes = await fetch("/api/visit-summary/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName,
          technicianId,
          technicianName: technicianId,
          date,
          taskItemIds,
        }),
      });

      const createJson = await createRes.json();

      if (!createJson.success) {
        alert("שגיאה ביצירת סיכום ביקור");
        return;
      }

      const summaryItemId = createJson.summaryItemId;

      /* 2️⃣ העלאת חתימות */
      const uploadRes = await fetch(
        "/api/visit-summary/upload-signatures",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summaryItemId,
            clientSignature,
            technicianSignature,
            clientName,
          }),
        }
      );

      const uploadJson = await uploadRes.json();

      if (!uploadJson.success) {
        alert("שגיאה בהעלאת החתימות");
        return;
      }

      alert("✅ סיום ביקור נשמר בהצלחה");

      // 🧹 ניקוי Context וחזרה למסך ראשי
      clearWork();
      router.replace("/");

    } catch (err) {
      console.error(err);
      alert("שגיאת רשת");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        חתימת סיום ביקור
      </h1>

      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <div><strong>פרויקט:</strong> {projectName}</div>
        <div><strong>תאריך:</strong> {date}</div>
        <div><strong>טכנאי:</strong> {technicianId}</div>
        <div><strong>משימות בדוח:</strong> {taskItemIds.length}</div>
      </div>

      <div>
        <label className="block mb-1 font-medium">
          שם נציג הלקוח
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="form-input w-full"
          placeholder="שם מלא"
        />
      </div>

      <div className="space-y-2">
        <div className="font-medium">חתימת נציג הלקוח</div>
        <div className="border rounded">
          <SignatureCanvas
            ref={clientSigRef}
            penColor="black"
            canvasProps={{ width: 350, height: 150 }}
          />
        </div>
        <button
          type="button"
          onClick={clearClientSignature}
          className="text-sm text-blue-600 underline"
        >
          נקה חתימה
        </button>
      </div>

      <div className="space-y-2">
        <div className="font-medium">חתימת טכנאי</div>
        <div className="border rounded">
          <SignatureCanvas
            ref={techSigRef}
            penColor="black"
            canvasProps={{ width: 350, height: 150 }}
          />
        </div>
        <button
          type="button"
          onClick={clearTechSignature}
          className="text-sm text-blue-600 underline"
        >
          נקה חתימה
        </button>
      </div>

      <button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
      >
        {submitting ? "שומר..." : "אישור סיום ביקור"}
      </button>
    </div>
  );
}
