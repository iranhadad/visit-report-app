import { NextResponse } from "next/server";

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN!;

// Boards
const TASKS_BOARD_ID = 18392796088;
const SUBITEMS_BOARD_ID = 18392796093;

// Columns
const PROJECT_NUMBER_COLUMN = "numeric_mkyx9yah";
const TECHNICIAN_COLUMN = "person";

const DATE_COLUMN = "date0";
const BUILDING_COLUMN = "text_mkys4gay";
const FLOOR_COLUMN = "text_mkysh2sm";
const APARTMENT_COLUMN = "text_mkys78jp";
const LOCATION_DESC_COLUMN = "text_mkys1ted";
const NOTES_COLUMN = "text_mkysdz8f";
const STATUS_COLUMN = "status";
const FILE_COLUMN = "file_mkys7yjr";

async function mondayQuery(query: string) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      Authorization: MONDAY_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const technicianId = searchParams.get("technicianId");
    const date = searchParams.get("date");

    if (!projectId || !technicianId || !date) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    /* 1️⃣ משימות */
    const itemsRes = await mondayQuery(`
      query {
        boards(ids: [${TASKS_BOARD_ID}]) {
          items_page(limit: 100) {
            items {
              id
              name
              column_values(ids: ["${PROJECT_NUMBER_COLUMN}", "${TECHNICIAN_COLUMN}"]) {
                id
                value
              }
            }
          }
        }
      }
    `);

    const items = itemsRes.data.boards[0].items_page.items;

    const filteredItems = items.filter((item: any) => {
      const projectCol = item.column_values.find((c: any) => c.id === PROJECT_NUMBER_COLUMN);
      const techCol = item.column_values.find((c: any) => c.id === TECHNICIAN_COLUMN);

      if (!projectCol?.value || !techCol?.value) return false;

      const projectMatch = projectCol.value.replace(/"/g, "") === projectId;

      try {
        const people = JSON.parse(techCol.value);
        return (
          projectMatch &&
          people.personsAndTeams.some((p: any) => String(p.id) === technicianId)
        );
      } catch {
        return false;
      }
    });

    const itemIds = filteredItems.map((i: any) => i.id);

    /* 2️⃣ דיווחים */
    const subRes = await mondayQuery(`
      query {
        boards(ids: [${SUBITEMS_BOARD_ID}]) {
          items_page(limit: 200) {
            items {
              id
              parent_item { id }
              column_values(ids: [
                "${DATE_COLUMN}",
                "${BUILDING_COLUMN}",
                "${FLOOR_COLUMN}",
                "${APARTMENT_COLUMN}",
                "${LOCATION_DESC_COLUMN}",
                "${NOTES_COLUMN}",
                "${STATUS_COLUMN}",
                "${FILE_COLUMN}"
              ]) {
                id
                value
                text
              }
            }
          }
        }
      }
    `);

    const subitems = subRes.data.boards[0].items_page.items;

    const relevantSubitems = subitems.filter((sub: any) => {
      if (!itemIds.includes(sub.parent_item?.id)) return false;
      const dateCol = sub.column_values.find((c: any) => c.id === DATE_COLUMN);
      try {
        return JSON.parse(dateCol.value)?.date === date;
      } catch {
        return false;
      }
    });

    /* 3️⃣ שליפת תמונות */
    const assetIds = relevantSubitems
      .map((sub: any) => {
        const fileCol = sub.column_values.find((c: any) => c.id === FILE_COLUMN);
        try {
          const parsed = JSON.parse(fileCol?.value || "{}");
          return parsed?.files?.[0]?.assetId;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const assetsMap: Record<string, string> = {};

    if (assetIds.length) {
      const assetsRes = await mondayQuery(`
        query {
          assets(ids: [${assetIds.join(",")}]) {
            id
            public_url
          }
        }
      `);

      assetsRes.data.assets.forEach((a: any) => {
        assetsMap[a.id] = a.public_url;
      });
    }

    /* 4️⃣ בניית תשובה */
    const itemsWithReports = filteredItems.map((item: any) => {
      const reports = relevantSubitems
        .filter((sub: any) => sub.parent_item.id === item.id)
        .map((sub: any) => {
          const getText = (id: string) =>
            sub.column_values.find((c: any) => c.id === id)?.text || "";

          let imageUrl: string | null = null;
          const fileCol = sub.column_values.find((c: any) => c.id === FILE_COLUMN);
          try {
            const parsed = JSON.parse(fileCol?.value || "{}");
            const assetId = parsed?.files?.[0]?.assetId;
            imageUrl = assetId ? assetsMap[assetId] : null;
          } catch {}

          return {
            subitemId: sub.id,
            location: {
              building: getText(BUILDING_COLUMN),
              floor: getText(FLOOR_COLUMN),
              apartment: getText(APARTMENT_COLUMN),
              description: getText(LOCATION_DESC_COLUMN),
            },
            notes: getText(NOTES_COLUMN),
            status: getText(STATUS_COLUMN),
            imageUrl,
          };
        });

      if (!reports.length) return null;

      return {
        itemId: item.id,
        itemName: item.name,
        reports,
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      projectId,
      technicianId,
      date,
      items: itemsWithReports,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
