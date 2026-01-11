"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWork } from "@/app/context/WorkContext";

type Report = {
  subitemId: string;
  location: {
    building: string;
    floor: string;
    apartment: string;
    description: string;
  };
  notes: string;
  status: string;
  imageUrl?: string;
};

type ItemSummary = {
  itemId: string;
  itemName: string;
  reports: Report[];
};

type VisitSummaryResponse = {
  success: boolean;
  date: string;
  items: ItemSummary[];
};

export default function VisitSummaryPage() {
  const router = useRouter();
  const { work, setDate } = useWork();

  const [data, setData] = useState<VisitSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🖼️ תמונה פתוחה ב־Modal
  const [openImage, setOpenImage] = useState<string | null>(null);

  /* -------------------------------------------------
     🛡️ Guard – חייבים Context מלא
  -------------------------------------------------- */
  useEffect(() => {
    if (!work.project || !work.technician || !work.task) {
      router.replace("/");
      return;
    }

    if (!work.date) {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
    }
  }, [work, router, setDate]);

  /* -------------------------------------------------
     שליפת סיכום ביקור
  -------------------------------------------------- */
  useEffect(() => {
    if (!work.project || !work.technician || !work.date) return;

    async function fetchSummary() {
      try {
        const res = await fetch(
          `/api/visit-summary?projectId=${work.project.id}&technicianId=${work.technician.id}&date=${work.date}`
        );
        const json = await res.json();

        if (!json.success) {
          setError("שגיאה בשליפת סיכום הביקור");
        } else {
          setData(json);
        }
      } catch {
        setError("שגיאת רשת");
      } finally {
        setLoadingSummary(false);
      }
    }

    fetchSummary();
  }, [work.project, work.technician, work.date]);

  /* -------------------------------------------------
     ✅ ניווט תקין למסך חתימות
  -------------------------------------------------- */
  function handleFinishVisit() {
    if (!work.task) {
      alert("חסרה משימה פעילה");
      return;
    }

    router.push(`/task/${work.task.id}/summary/sign`);
  }

  if (loadingSummary) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        טוען סיכום ביקור...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!data || !work.project || !work.technician) return null;

  return (
    <>
      <div className="max-w-xl mx-auto p-6 space-y-6 text-right">
        <h1 className="text-2xl font-bold text-center">סיכום ביקור</h1>

        {/* פרטי ביקור */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
          <div>
            <strong>פרויקט:</strong> {work.project.name}
          </div>
          <div>
            <strong>תאריך:</strong> {data.date}
          </div>
          <div>
            <strong>טכנאי:</strong> {work.technician.id}
          </div>
        </div>

        {/* תוכן */}
        <div className="space-y-6">
          {data.items.map((item) => (
            <div
              key={item.itemId}
              className="border rounded-lg p-4 space-y-4"
            >
              <h2 className="font-semibold text-lg">
                {item.itemName}
              </h2>

              {item.reports.map((report, index) => (
                <div
                  key={report.subitemId}
                  className="bg-gray-50 rounded p-3 text-sm flex gap-4 items-stretch"
                >
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">
                      דיווח {index + 1}
                    </div>

                    <div>
                      <strong>מיקום:</strong> בניין{" "}
                      {report.location.building}, קומה{" "}
                      {report.location.floor}, דירה{" "}
                      {report.location.apartment}
                    </div>

                    {report.location.description && (
                      <div>
                        <strong>תיאור מיקום:</strong>{" "}
                        {report.location.description}
                      </div>
                    )}

                    {report.notes && (
                      <div>
                        <strong>הערות:</strong> {report.notes}
                      </div>
                    )}

                    <div>
                      <strong>סטטוס:</strong> {report.status}
                    </div>
                  </div>

                  {report.imageUrl && (
                    <div className="flex">
                      <img
                        src={report.imageUrl}
                        alt="תיעוד מהשטח"
                        className="w-28 h-full object-cover rounded border cursor-pointer hover:opacity-90"
                        onClick={() =>
                          setOpenImage(report.imageUrl!)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <button
          onClick={handleFinishVisit}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
        >
          סיום ביקור וחתימה
        </button>
      </div>

      {/* 🖼️ MODAL תמונה */}
      {openImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpenImage(null)}
        >
          <img
            src={openImage}
            alt="תמונה מלאה"
            className="max-h-full max-w-full rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
