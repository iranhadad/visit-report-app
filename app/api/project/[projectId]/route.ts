import { NextResponse } from "next/server";

const MONDAY_API_URL = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN!;

// לוח "הזמנות בעבודה"
const TASKS_BOARD_ID = 18392796088;

// IDs של עמודות
const PROJECT_ID_COLUMN = "numeric_mkyx9yah";
const REQUIRED_COLUMN = "numeric_mkxqmet4";
const DONE_COLUMN = "numeric_mkytx33q";
const REMAIN_COLUMN = "numeric_mkyw4ps";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const query = `
      query {
        boards(ids: ${TASKS_BOARD_ID}) {
          items_page(
            limit: 200,
            query_params: {
              rules: [
                {
                  column_id: "${PROJECT_ID_COLUMN}",
                  compare_value: [${projectId}]
                }
              ]
            }
          ) {
            items {
              id
              name
              column_values(ids: [
                "${REQUIRED_COLUMN}",
                "${DONE_COLUMN}",
                "${REMAIN_COLUMN}"
              ]) {
                id
                text
              }
            }
          }
        }
      }
    `;

    const res = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: MONDAY_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();

    if (!json.data) {
      console.error("Monday API error:", json);
      return NextResponse.json({ error: "Monday API error" }, { status: 500 });
    }

    const items =
      json.data.boards[0]?.items_page?.items || [];

    const result = items.map((item: any) => {
      const getValue = (id: string) =>
        item.column_values.find((c: any) => c.id === id)?.text || "0";

      return {
        itemId: item.id,
        serviceName: item.name,
        required: Number(getValue(REQUIRED_COLUMN)),
        done: Number(getValue(DONE_COLUMN)),
        remaining: Number(getValue(REMAIN_COLUMN)),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
