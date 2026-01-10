import { NextResponse } from "next/server";

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN!;

// Boards
const SUMMARY_BOARD_ID = 18394724561; // סיכומי ביקור
const TASKS_BOARD_ID = 18392796088;   // הזמנות בעבודה (משימות)

// Columns – לוח סיכומי ביקור
const TECHNICIAN_COLUMN = "person";
const STATUS_COLUMN = "status";
const DATE_COLUMN = "date4";
const PROJECT_NAME_COLUMN = "text_mkze5fwc";
const PROJECT_ID_COLUMN = "numeric_mkzeabjg";
const TASKS_RELATION_COLUMN = "board_relation_mkzefp1y";

// Columns – לוח משימות (אופציונלי – קישור חזרה)
const TASK_TO_SUMMARY_RELATION_COLUMN = "board_relation_mkzet4sm";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      projectId,
      projectName,
      technicianId,
      technicianName,
      date,
      taskItemIds,
    } = body;

    if (
      !projectId ||
      !projectName ||
      !technicianId ||
      !technicianName ||
      !date ||
      !Array.isArray(taskItemIds)
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
       0️⃣ ניקוי וולידציה ל־IDs של משימות (קריטי!)
    -------------------------------------------------- */
    const cleanedTaskItemIds = Array.from(
      new Set(
        taskItemIds
          .map((id: any) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      )
    );

    if (cleanedTaskItemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid task item IDs" },
        { status: 400 }
      );
    }

    /* -------------------------------------------------
       1️⃣ יצירת Item בלוח סיכומי ביקור
    -------------------------------------------------- */

    const itemName = `${date} | ${projectName} | ${technicianName}`;

    const columnValues = {
      [TECHNICIAN_COLUMN]: {
        personsAndTeams: [{ id: Number(technicianId), kind: "person" }],
      },
      [DATE_COLUMN]: { date },
      [PROJECT_NAME_COLUMN]: projectName,
      [PROJECT_ID_COLUMN]: projectId,
      [STATUS_COLUMN]: { label: "Done" },
      [TASKS_RELATION_COLUMN]: {
        item_ids: cleanedTaskItemIds,
      },
    };

    const createMutation = `
      mutation {
        create_item(
          board_id: ${SUMMARY_BOARD_ID},
          item_name: "${itemName.replace(/"/g, '\\"')}",
          column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}"
        ) {
          id
        }
      }
    `;

    const createRes = await fetch(MONDAY_API, {
      method: "POST",
      headers: {
        Authorization: MONDAY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: createMutation }),
    });

    const createJson = await createRes.json();
    const summaryItemId = createJson?.data?.create_item?.id;

    if (!summaryItemId) {
      console.error("Create summary error:", createJson);
      return NextResponse.json(
        { success: false, error: "Failed to create summary item" },
        { status: 500 }
      );
    }

    /* -------------------------------------------------
       2️⃣ (אופציונלי) קישור חזרה מכל משימה → לסיכום
       אפשר להשאיר / להסיר – לא חובה לתפקוד
    -------------------------------------------------- */

    for (const taskId of cleanedTaskItemIds) {
      const linkMutation = `
        mutation {
          change_column_value(
            board_id: ${TASKS_BOARD_ID},
            item_id: ${taskId},
            column_id: "${TASK_TO_SUMMARY_RELATION_COLUMN}",
            value: "{\\"item_ids\\":[${summaryItemId}]}"
          ) {
            id
          }
        }
      `;

      await fetch(MONDAY_API, {
        method: "POST",
        headers: {
          Authorization: MONDAY_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: linkMutation }),
      });
    }

    /* -------------------------------------------------
       3️⃣ תשובה סופית
    -------------------------------------------------- */

    return NextResponse.json({
      success: true,
      summaryItemId,
    });

  } catch (error) {
    console.error("visit-summary/create API error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
