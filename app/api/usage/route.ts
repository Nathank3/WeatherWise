import { NextResponse } from "next/server";
import { normalizeUsageResponse } from "@/lib/weather";

export const dynamic = "force-dynamic";

const WEATHER_AI_BASE_URL = "https://api.weather-ai.co";

export async function GET() {
  const apiKey = process.env.WEATHER_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ available: false }, { status: 200 });
  }

  try {
    const response = await fetch(`${WEATHER_AI_BASE_URL}/v1/usage`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("WeatherAI usage request failed", response.status, payload);
      }

      return NextResponse.json({ available: false }, { status: 200 });
    }

    return NextResponse.json(normalizeUsageResponse(payload));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("WeatherAI usage route error", error);
    }

    return NextResponse.json({ available: false }, { status: 200 });
  }
}
