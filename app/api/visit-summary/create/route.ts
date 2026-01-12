import { NextResponse } from "next/server";

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN!;

// Boards
const SUMMARY_BOARD_ID = 18394724561;   // סיכומי ביקור
const SUBITEMS_BOARD_ID = 18392796093;  // Subitems

// Columns – סיכום ביקור
const TECHNICIAN_COLUMN = "person";
const STATUS_COLUMN = "status";
const DATE_COLUMN = "date4";
const PROJECT_NAME_COLUMN = "text_mkze5fwc";
const PROJECT_ID_COLUMN = "numeric_mkzeabjg";
const CLIENT_NAME_COLUMN = "text_mkzf3p9x";
const CLIENT_ROLE_COLUMN = "text_mkzf6812";

// Columns – Subitems
const SUMMARY_ID_COLUMN = "numeric_mkzh3g1k";
const SUBITEM_STATUS_COLUMN = "status";

const STATUS_DONE = "Done";
const STATUS_SIGNED = "חתום ומאושר";

/* -------------------------------------------------
   Helper – Monday request
-------------------------------------------------- */
async function mondayRequest(query: string) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      Authorization: MONDAY_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();

  if (json.errors) {
    console.error("❌ Monday API error:", json.errors);
    throw new Error("Monday API error");
  }

  return json;
}

/* -------------------------------------------------
   POST
-------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const {
      projectId,
      projectName,
      technicianId,
      technicianName,
      date,
      clientName,
      clientRole,
      subitemIds,
    } = await req.json();

    console.log("=== PAYLOAD ===", {
      projectId,
      date,
      technicianId,
      subitemIds,
    });

    if (
      !projectId ||
      !projectName ||
      !technicianId ||
      !date ||
      !Array.isArray(subitemIds) ||
      subitemIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
       1️⃣ שליפת סטטוס אמיתי של Subitems
    -------------------------------------------------- */
    const ids = subitemIds.map(Number).join(",");

    const fetchSubitemsQuery = `
      query {
        items(ids: [${ids}]) {
          id
          column_values(ids: ["${SUBITEM_STATUS_COLUMN}"]) {
            id
            text
          }
        }
      }
    `;

    const subitemsRes = await mondayRequest(fetchSubitemsQuery);

    const eligibleSubitems = subitemsRes.data.items.filter(
      (item: any) =>
        item.column_values[0]?.text === STATUS_DONE
    );

    console.log(
      "✅ Eligible subitems (Done בלבד):",
      eligibleSubitems.map((i: any) => i.id)
    );

    if (eligibleSubitems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "אין דיווחים חדשים לסיכום ביקור",
      });
    }

    /* -------------------------------------------------
       2️⃣ יצירת סיכום ביקור
    -------------------------------------------------- */
    const itemName = `${date} | ${projectName} | ${technicianName || technicianId}`;

    const columnValues = {
      [TECHNICIAN_COLUMN]: {
        personsAndTeams: [{ id: Number(technicianId), kind: "person" }],
      },
      [DATE_COLUMN]: { date },
      [PROJECT_NAME_COLUMN]: projectName,
      [PROJECT_ID_COLUMN]: Number(projectId),
      [STATUS_COLUMN]: { label: STATUS_DONE },
      [CLIENT_NAME_COLUMN]: clientName || "",
      [CLIENT_ROLE_COLUMN]: clientRole || "",
    };

    console.log("=== SUMMARY COLUMN VALUES ===", columnValues);

    const createItemQuery = `
      mutation {
        create_item(
          board_id: ${SUMMARY_BOARD_ID},
          item_name: "${itemName.replace(/"/g, '\\"')}",
          column_values: ${JSON.stringify(JSON.stringify(columnValues))}
        ) {
          id
        }
      }
    `;

    const createRes = await mondayRequest(createItemQuery);
    const summaryItemId = Number(createRes.data.create_item.id);

    console.log("✅ Summary created:", summaryItemId);

    /* -------------------------------------------------
       3️⃣ עדכון רק Subitems שעברו סינון
    -------------------------------------------------- */
    for (const item of eligibleSubitems) {
      const updateValues = {
        [SUMMARY_ID_COLUMN]: summaryItemId,
        [SUBITEM_STATUS_COLUMN]: { label: STATUS_SIGNED },
      };

      const updateQuery = `
        mutation {
          change_multiple_column_values(
            board_id: ${SUBITEMS_BOARD_ID},
            item_id: ${item.id},
            column_values: ${JSON.stringify(JSON.stringify(updateValues))}
          ) {
            id
          }
        }
      `;

      await mondayRequest(updateQuery);
    }

    return NextResponse.json({
      success: true,
      summaryItemId,
      updatedSubitems: eligibleSubitems.map((i: any) => i.id),
    });

  } catch (err) {
    console.error("❌ visit-summary/create error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
