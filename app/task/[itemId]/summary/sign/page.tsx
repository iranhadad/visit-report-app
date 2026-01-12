"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useWork } from "@/app/context/WorkContext";

export default function VisitSignaturePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearWork } = useWork();

  const itemId = params.itemId as string;

  // 🔑 URL = מקור אמת
  const projectId = searchParams.get("projectId");
  const technicianId = searchParams.get("technicianId");
  const date = searchParams.get("date");

  const subitemIds =
    searchParams.get("subitems")?.split(",").filter(Boolean) ?? [];

  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clientSigRef = useRef<SignatureCanvas>(null);
  const techSigRef = useRef<SignatureCanvas>(null);

  /* 🛡️ Guard – URL בלבד */
  useEffect(() => {
    if (
      !itemId ||
      !projectId ||
      !technicianId ||
      !date ||
      subitemIds.length === 0
    ) {
      console.log("⛔ redirect from signature", {
        itemId,
        projectId,
        technicianId,
        date,
        subitemIds,
      });
      router.replace("/");
    }
  }, [itemId, projectId, technicianId, date, subitemIds, router]);

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

    if (!clientName.trim()) {
      alert("יש להזין שם נציג הלקוח");
      return;
    }

    try {
      setSubmitting(true);

      /* 1️⃣ יצירת סיכום ביקור + עדכון subitems */
      const createRes = await fetch("/api/visit-summary/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName: projectId, // זמני
          technicianId,
          technicianName: technicianId,
          date,
          subitemIds,

          // ✅ התיקון הקריטי
          clientName,
          clientRole,
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
          }),
        }
      );

      const uploadJson = await uploadRes.json();

      if (!uploadJson.success) {
        alert("שגיאה בהעלאת החתימות");
        return;
      }

      alert("✅ סיום ביקור נשמר בהצלחה");

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
        <div><strong>תאריך:</strong> {date}</div>
        <div><strong>טכנאי:</strong> {technicianId}</div>
        <div><strong>דיווחים בביקור:</strong> {subitemIds.length}</div>
      </div>

      {/* שם נציג */}
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

      {/* תפקיד נציג */}
      <div>
        <label className="block mb-1 font-medium">
          תפקיד נציג הלקוח
        </label>
        <input
          type="text"
          value={clientRole}
          onChange={(e) => setClientRole(e.target.value)}
          className="form-input w-full"
          placeholder="לדוגמה: מנהל אחזקה / דייר / מפקח"
        />
      </div>

      {/* חתימת לקוח */}
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

      {/* חתימת טכנאי */}
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
