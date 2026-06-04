import { NextResponse } from "next/server";
import { normalizeWeatherResponse } from "@/lib/weather";

export const dynamic = "force-dynamic";

const WEATHER_AI_BASE_URL = "https://api.weather-ai.co";

function parseCoordinate(value: string | null, min: number, max: number): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function parseDays(value: string | null): number {
  const parsed = value ? Number(value) : 7;
  if (!Number.isFinite(parsed)) {
    return 7;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), 7);
}

export async function GET(request: Request) {
  const apiKey = process.env.WEATHER_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "WEATHER_AI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = parseCoordinate(searchParams.get("lat"), -90, 90);
  const lon = parseCoordinate(searchParams.get("lon"), -180, 180);

  if (lat === undefined || lon === undefined) {
    return NextResponse.json({ error: "Valid lat and lon query parameters are required." }, { status: 400 });
  }

  const days = parseDays(searchParams.get("days"));
  const units = searchParams.get("units") || "metric";
  const lang = searchParams.get("lang") || "en";
  const ai = searchParams.get("ai") ?? "true";

  const upstreamUrl = new URL("/v1/weather", WEATHER_AI_BASE_URL);
  upstreamUrl.searchParams.set("lat", String(lat));
  upstreamUrl.searchParams.set("lon", String(lon));
  upstreamUrl.searchParams.set("days", String(days));
  upstreamUrl.searchParams.set("units", units);
  upstreamUrl.searchParams.set("lang", lang);
  upstreamUrl.searchParams.set("ai", ai === "false" ? "false" : "true");

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("WeatherAI weather request failed", response.status, payload);
      }

      return NextResponse.json(
        { error: "Weather data is temporarily unavailable. Please try another location or retry shortly." },
        { status: response.status },
      );
    }

    const normalized = normalizeWeatherResponse(payload, lat, lon, units);

    if (process.env.NODE_ENV === "development" && normalized.rawShape.length === 0) {
      console.warn("Unexpected WeatherAI weather response shape", payload);
    }

    return NextResponse.json(normalized);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("WeatherAI weather route error", error);
    }

    return NextResponse.json(
      { error: "Unable to reach WeatherAI right now. Please check your connection and try again." },
      { status: 502 },
    );
  }
}
