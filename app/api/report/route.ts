import { NextResponse } from "next/server";

const MONDAY_API = "https://api.monday.com/v2";
const MONDAY_FILE_API = "https://api.monday.com/v2/file";
const TOKEN = process.env.MONDAY_API_TOKEN!;

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const parentItemId = form.get("parentItemId") as string;
    const file = form.get("file") as File | null;

    if (!parentItemId) {
      return NextResponse.json(
        { success: false, error: "Missing parentItemId" },
        { status: 400 }
      );
    }

    const columnValues = {
      date0: { date: form.get("date") },
      text_mkys4gay: form.get("building"),
      text_mkysh2sm: form.get("floor"),
      text_mkys78jp: form.get("apartment"),
      text_mkys1ted: form.get("location"),
      text_mkysdz8f: form.get("notes"),
      status: { label: form.get("status") },
    };

    /* 1️⃣ יצירת subitem */
    const createSubitemRes = await fetch(MONDAY_API, {
      method: "POST",
      headers: {
        Authorization: TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation {
            create_subitem(
              parent_item_id: ${parentItemId},
              item_name: "דיווח טכנאי",
              column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}"
            ) {
              id
            }
          }
        `,
      }),
    });

    const createSubitemJson = await createSubitemRes.json();
    const subitemId = createSubitemJson?.data?.create_subitem?.id;

    if (!subitemId) {
      console.error("Subitem creation error:", createSubitemJson);
      return NextResponse.json(
        { success: false, error: "Failed to create subitem" },
        { status: 500 }
      );
    }

    /* 2️⃣ יצירת UPDATE על ה-subitem */
    let updateId: string | null = null;

    if (file) {
      const createUpdateRes = await fetch(MONDAY_API, {
        method: "POST",
        headers: {
          Authorization: TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation {
              create_update(
                item_id: ${subitemId},
                body: "📎 קובץ מצורף לדיווח"
              ) {
                id
              }
            }
          `,
        }),
      });

      const createUpdateJson = await createUpdateRes.json();
      updateId = createUpdateJson?.data?.create_update?.id;

      if (!updateId) {
        console.error("Update creation error:", createUpdateJson);
      }
    }

    /* 3️⃣ העלאת קובץ ל-UPDATE */
    if (file && updateId) {
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer], { type: file.type });

      const uploadForm = new FormData();

      const operations = {
        query: `
          mutation ($file: File!) {
            add_file_to_update(
              update_id: ${updateId},
              file: $file
            ) {
              id
            }
          }
        `,
        variables: { file: null },
      };

      uploadForm.append("operations", JSON.stringify(operations));
      uploadForm.append("map", JSON.stringify({ "0": ["variables.file"] }));
      uploadForm.append("0", blob, file.name);

      const uploadRes = await fetch(MONDAY_FILE_API, {
        method: "POST",
        headers: {
          Authorization: TOKEN,
        },
        body: uploadForm,
      });

      const uploadJson = await uploadRes.json();

      if (uploadJson.errors) {
        console.error("File upload error:", uploadJson.errors);
      } else {
        console.log("File upload success:", uploadJson);
      }
    }

    return NextResponse.json({ success: true, subitemId });

  } catch (e) {
    console.error("Report API error:", e);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
