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
  const { work } = useWork();

  const [data, setData] = useState<VisitSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openImage, setOpenImage] = useState<string | null>(null);

  /* -------------------------------------------------
     🛡️ Guard – בלי Context אין מה לחפש פה
  -------------------------------------------------- */
  useEffect(() => {
    if (!work.project || !work.technician || !work.date) {
      router.replace("/");
    }
  }, [work, router]);

  /* -------------------------------------------------
     ⛔ עצירה מוחלטת ל־TypeScript
  -------------------------------------------------- */
  if (!work.project || !work.technician || !work.date) {
    return null;
  }

  const { project, technician, date } = work;

  /* -------------------------------------------------
     📡 Fetch סיכום ביקור
  -------------------------------------------------- */
  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(
          `/api/visit-summary?projectId=${project.id}&technicianId=${technician.id}&date=${date}`
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
        setLoading(false);
      }
    }

    fetchSummary();
  }, [project.id, technician.id, date]);

  function goToSign() {
    router.push(`/task/${work.task?.id}/summary/sign`);
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        טוען סיכום ביקור…
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

  if (!data) return null;

  return (
    <>
      <div className="max-w-xl mx-auto p-6 space-y-6 text-right">
        <h1 className="text-2xl font-bold text-center">סיכום ביקור</h1>

        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
          <div><strong>פרויקט:</strong> {project.name}</div>
          <div><strong>תאריך:</strong> {data.date}</div>
          <div><strong>טכנאי:</strong> {technician.id}</div>
        </div>

        <div className="space-y-6">
          {data.items.map((item) => (
            <div key={item.itemId} className="border rounded-lg p-4 space-y-4">
              <h2 className="font-semibold text-lg">{item.itemName}</h2>

              {item.reports.map((report, index) => (
                <div
                  key={report.subitemId}
                  className="bg-gray-50 rounded p-3 text-sm flex gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">דיווח {index + 1}</div>

                    <div>
                      <strong>מיקום:</strong> בניין {report.location.building},
                      קומה {report.location.floor},
                      דירה {report.location.apartment}
                    </div>

                    {report.location.description && (
                      <div>
                        <strong>תיאור:</strong> {report.location.description}
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
                    <img
                      src={report.imageUrl}
                      className="w-28 rounded border cursor-pointer"
                      onClick={() => setOpenImage(report.imageUrl!)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <button
          onClick={goToSign}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
        >
          סיום ביקור וחתימה
        </button>
      </div>

      {openImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={() => setOpenImage(null)}
        >
          <img src={openImage} className="max-h-full max-w-full rounded" />
        </div>
      )}
    </>
  );
}
