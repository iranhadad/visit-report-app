import { NextResponse } from "next/server";

const MONDAY_API = "https://api.monday.com/v2/file";
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN!;

// Columns
const TECH_SIGNATURE_COLUMN = "file_mkzep2yv";
const CLIENT_SIGNATURE_COLUMN = "file_mkzeqt6";

function base64ToBlob(base64: string) {
  const parts = base64.split(",");
  const byteString = atob(parts[1]);
  const mimeString = parts[0].match(/:(.*?);/)?.[1] || "image/png";

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

export async function POST(req: Request) {
  try {
    const {
      summaryItemId,
      clientSignature,
      technicianSignature,
      clientName,
    } = await req.json();

    if (
      !summaryItemId ||
      !clientSignature ||
      !technicianSignature ||
      isNaN(Number(summaryItemId))
    ) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    async function uploadFile(
      columnId: string,
      base64: string,
      filename: string
    ) {
      const formData = new FormData();

      const mutation = `
        mutation ($file: File!) {
          add_file_to_column (
            item_id: ${Number(summaryItemId)},
            column_id: "${columnId}",
            file: $file
          ) {
            id
          }
        }
      `;

      formData.append("query", mutation);
      formData.append(
        "variables[file]",
        base64ToBlob(base64),
        filename
      );

      const res = await fetch(MONDAY_API, {
        method: "POST",
        headers: {
          Authorization: MONDAY_TOKEN,
        },
        body: formData,
      });

      const json = await res.json();

      if (json.errors) {
        throw new Error(JSON.stringify(json.errors));
      }
    }

    await uploadFile(
      CLIENT_SIGNATURE_COLUMN,
      clientSignature,
      `client-signature${clientName ? "-" + clientName : ""}.png`
    );

    await uploadFile(
      TECH_SIGNATURE_COLUMN,
      technicianSignature,
      "technician-signature.png"
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("upload-signatures error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
