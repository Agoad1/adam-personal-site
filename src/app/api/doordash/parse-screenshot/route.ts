import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  // Auth check — admin only
  const supabase = await createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: `This is a DoorDash earnings screenshot from the Dasher app. Extract the following information and return ONLY valid JSON with no markdown, no code blocks, no explanation.

Return this exact JSON shape:
{
  "date": "YYYY-MM-DD",
  "income": 0.00,
  "active_hours": 0.0,
  "dash_hours": 0.0,
  "offers": 0,
  "trips": 0,
  "deliveries": [
    { "restaurant_name": "string", "amount": 0.00 }
  ]
}

Rules:
- date: the date of the dash in YYYY-MM-DD format. If only month/day shown, use year 2026.
- income: total dollar amount earned (the large $ number at top)
- active_hours: "Active time" converted to decimal hours (e.g. "2 hr 41 min" = 2.68)
- dash_hours: "Dash time" converted to decimal hours (e.g. "3 hr 27 min" = 3.45)
- offers: number of offers accepted
- trips: number of deliveries completed
- deliveries: array of each individual offer shown, with restaurant name and payout amount
- If a field is not visible in the screenshot, use null for numbers and [] for arrays.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text.trim());
    return NextResponse.json(parsed);
  } catch {
    // Try to extract JSON if there's extra text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return NextResponse.json(JSON.parse(match[0]));
      } catch {
        // fall through
      }
    }
    return NextResponse.json({ error: "Failed to parse AI response", raw: text }, { status: 500 });
  }
}
