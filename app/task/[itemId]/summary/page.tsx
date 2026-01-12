"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const params = useParams();
  const { work } = useWork();

  const itemId = params.itemId as string;

  // 🔑 URL = מקור אמת
  const projectId =
    work.project?.id || searchParams.get("projectId");
  const technicianId =
    work.technician?.id || searchParams.get("technicianId");
  const date =
    work.date || searchParams.get("date");

  const [data, setData] = useState<VisitSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openImage, setOpenImage] = useState<string | null>(null);

  /* 🛡️ Guard מינימלי */
  useEffect(() => {
    if (!itemId || !projectId || !technicianId || !date) {
      console.log("⛔ redirect from summary", {
        itemId,
        projectId,
        technicianId,
        date,
      });
      router.replace("/");
    }
  }, [itemId, projectId, technicianId, date, router]);

  /* 📡 Fetch סיכום ביקור */
  useEffect(() => {
    if (!projectId || !technicianId || !date) return;

    async function fetchSummary() {
      try {
        const res = await fetch(
          `/api/visit-summary?projectId=${projectId}&technicianId=${technicianId}&date=${date}`
        );
        const json = await res.json();

        if (!json.success) {
          setError("שגיאה בשליפת סיכום ביקור");
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
  }, [projectId, technicianId, date]);

  function goToSign() {
    if (!data) return;

    const subitemIds = data.items.flatMap((i) =>
      i.reports.map((r) => r.subitemId)
    );

    if (!subitemIds.length) {
      alert("אין דיווחים לחתימה");
      return;
    }

    router.push(
      `/task/${itemId}/summary/sign?` +
        `projectId=${projectId}&technicianId=${technicianId}&date=${date}` +
        `&subitems=${subitemIds.join(",")}`
    );
  }

  if (loading) {
    return <div className="p-6 text-center">טוען סיכום ביקור…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">{error}</div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="max-w-xl mx-auto p-6 space-y-6 text-right">
        <h1 className="text-2xl font-bold text-center">
          סיכום ביקור
        </h1>

        {data.items.map((item) => (
          <div
            key={item.itemId}
            className="border rounded-lg p-4 space-y-4"
          >
            <h2 className="font-semibold text-lg">
              {item.itemName}
            </h2>

            {item.reports.map((r, i) => (
              <div
                key={r.subitemId}
                className="bg-gray-50 rounded p-3 text-sm flex gap-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="font-medium">
                    דיווח {i + 1}
                  </div>

                  <div>
                    <strong>מיקום:</strong>{" "}
                    בניין {r.location.building}, קומה{" "}
                    {r.location.floor}, דירה{" "}
                    {r.location.apartment}
                  </div>

                  {r.location.description && (
                    <div>
                      <strong>תיאור:</strong>{" "}
                      {r.location.description}
                    </div>
                  )}

                  {r.notes && (
                    <div>
                      <strong>הערות:</strong> {r.notes}
                    </div>
                  )}

                  <div>
                    <strong>סטטוס:</strong> {r.status}
                  </div>
                </div>

                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    className="w-28 rounded border cursor-pointer"
                    onClick={() => setOpenImage(r.imageUrl!)}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <button
          onClick={goToSign}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
        >
          סיום ביקור וחתימה
        </button>
      </div>

      {/* תצוגת תמונה מלאה */}
      {openImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={() => setOpenImage(null)}
        >
          <img
            src={openImage}
            className="max-h-full max-w-full rounded"
          />
        </div>
      )}
    </>
  );
}
