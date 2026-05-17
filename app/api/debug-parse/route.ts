import { NextRequest, NextResponse } from "next/server";
import { parsePDF } from "@/lib/parsers/pdf";
import { parseExcel, parseCSV, extractRawRows, type ParsedTransaction } from "@/lib/parsers/excel";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл байхгүй" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();

    let parsed: ParsedTransaction[] = [];
    let rawSample: unknown[] = [];

    if (ext === "pdf") {
      parsed = await parsePDF(buffer);
    } else if (ext === "csv") {
      parsed = parseCSV(buffer);
      rawSample = extractRawRows(buffer).slice(0, 20);
    } else if (ext === "xlsx" || ext === "xls") {
      parsed = parseExcel(buffer);
      rawSample = extractRawRows(buffer).slice(0, 20);
    }

    return NextResponse.json({
      fileName: file.name,
      parsedCount: parsed.length,
      parsed: parsed.slice(0, 10),
      rawSample,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "error",
    }, { status: 500 });
  }
}
