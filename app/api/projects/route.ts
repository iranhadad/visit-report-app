import { NextResponse } from "next/server";

const MONDAY_API_URL = "https://api.monday.com/v2";
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN!;

const TASKS_BOARD_ID = 18392796088; // הזמנות בעבודה
const TECHNICIAN_ID = 17117717;     // הטכנאי המחובר

export async function GET() {
  try {
    const query = `
      query {
        boards(ids: ${TASKS_BOARD_ID}) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values(ids: ["person", "board_relation_mkxtadm5"]) {
                id
                ... on PeopleValue {
                  persons_and_teams {
                    id
                  }
                }
                ... on BoardRelationValue {
                  linked_items {
                    id
                    name
                  }
                }
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
      console.error(json);
      return NextResponse.json([], { status: 200 });
    }

    const items = json.data.boards[0].items_page.items;

    // 🔹 סינון לפי טכנאי
    const myItems = items.filter((item: any) => {
      const peopleCol = item.column_values.find(
        (c: any) => c.id === "person"
      );
      return peopleCol?.persons_and_teams?.some(
        (p: any) => Number(p.id) === TECHNICIAN_ID
      );
    });

    // 🔹 קיבוץ לפי פרויקט
    const projectsMap = new Map<string, { id: string; name: string }>();

    myItems.forEach((item: any) => {
      const relationCol = item.column_values.find(
        (c: any) => c.id === "board_relation_mkxtadm5"
      );

      relationCol?.linked_items?.forEach((proj: any) => {
        projectsMap.set(proj.id, {
          id: proj.id,
          name: proj.name,
        });
      });
    });

    return NextResponse.json([...projectsMap.values()]);
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}
