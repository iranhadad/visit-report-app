import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      itemId,
      projectId,
      technicianId,
      date,
      clientName,
      clientSignature,
      technicianSignature,
    } = body;

    // כרגע – רק לוג לבדיקה
    console.log("📌 סיום ביקור – נתונים שהתקבלו:");
    console.log({
      itemId,
      projectId,
      technicianId,
      date,
      clientName,
      clientSignatureLength: clientSignature?.length,
      technicianSignatureLength: technicianSignature?.length,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("visit-signature API error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
