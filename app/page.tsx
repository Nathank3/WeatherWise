"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CloudSun,
  Droplets,
  Gauge,
  Leaf,
  Loader2,
  MapPin,
  Plane,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { buildDecisionCards, createFallbackSummary, type DecisionCard } from "@/lib/decisions";
import type { NormalizedUsage, NormalizedWeather, WeatherCondition } from "@/lib/weather";

const LOCATIONS = [
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "London", lat: 51.5072, lon: -0.1276 },
  { name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
];

const toneClasses: Record<DecisionCard["tone"], string> = {
  positive: "border-signal/20 bg-signal/10 text-signal",
  warning: "border-amberline/25 bg-amberline/10 text-amberline",
  danger: "border-berry/25 bg-berry/10 text-berry",
};

function formatNumber(value: number | undefined, suffix = "") {
  return typeof value === "number" ? `${Math.round(value)}${suffix}` : "Data unavailable";
}

function formatDay(value: string | undefined, index: number) {
  if (!value) {
    return index === 0 ? "Today" : `Day ${index + 1}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function metricRow(label: string, value: string, icon: ReactNode) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-md border border-mist bg-white/70 px-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-white">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function ForecastCard({ day, index }: { day: WeatherCondition; index: number }) {
  return (
    <article className="rounded-lg border border-mist bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{formatDay(day.date, index)}</p>
          <p className="mt-1 min-h-10 text-sm text-slate-600">{day.description ?? "Data unavailable"}</p>
        </div>
        <CloudSun className="h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-700">
        <div className="flex justify-between gap-4">
          <span>High / low</span>
          <strong className="text-ink">
            {day.high !== undefined || day.low !== undefined
              ? `${formatNumber(day.high, "°")} / ${formatNumber(day.low, "°")}`
              : "Data unavailable"}
          </strong>
        </div>
        <div className="flex justify-between gap-4">
          <span>Rain</span>
          <strong className="text-ink">{formatNumber(day.rainProbability ?? day.precipitation, day.rainProbability !== undefined ? "%" : " mm")}</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span>Wind</span>
          <strong className="text-ink">{formatNumber(day.windSpeed, " km/h")}</strong>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [weather, setWeather] = useState<NormalizedWeather | null>(null);
  const [usage, setUsage] = useState<NormalizedUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decisions = useMemo(() => (weather ? buildDecisionCards(weather) : []), [weather]);
  const summary = weather ? weather.aiSummary ?? createFallbackSummary(weather) : "";

  async function loadWeather(lat = selectedLocation.lat, lon = selectedLocation.lon) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        days: "7",
        units: "metric",
        lang: "en",
        ai: String(aiEnabled),
      });

      const [weatherResponse, usageResponse] = await Promise.all([
        fetch(`/api/weather?${params.toString()}`),
        fetch("/api/usage"),
      ]);

      const weatherPayload: unknown = await weatherResponse.json();
      const usagePayload: unknown = await usageResponse.json();

      if (!weatherResponse.ok) {
        const message =
          typeof weatherPayload === "object" &&
          weatherPayload !== null &&
          "error" in weatherPayload &&
          typeof weatherPayload.error === "string"
            ? weatherPayload.error
            : "Weather data could not be loaded.";
        throw new Error(message);
      }

      setWeather(weatherPayload as NormalizedWeather);
      setUsage(usagePayload as NormalizedUsage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Weather data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWeather(selectedLocation.lat, selectedLocation.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, aiEnabled]);

  function submitCustomLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lat = Number(customLat);
    const lon = Number(customLon);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setError("Enter valid latitude and longitude values.");
      return;
    }

    const custom = { name: "Custom coordinates", lat, lon };
    setSelectedLocation(custom);
  }

  return (
    <main className="min-h-screen">
      <section className="border-b border-mist bg-white/55">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex w-fit items-center gap-2 rounded-md border border-signal/20 bg-white px-3 py-2 text-sm font-semibold text-signal shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              WeatherAI integration challenge
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">WeatherWise</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              A smart weather decision dashboard that converts real-time weather and seven-day forecast data into practical planning
              guidance for travel, outdoor activity, field work, and daily risk awareness.
            </p>
          </div>

          <div className="rounded-lg border border-mist bg-white p-4 shadow-panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">Location</p>
                <p className="text-sm text-slate-500">Choose a city or enter coordinates.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadWeather()}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-mist bg-white text-ink transition hover:border-signal hover:text-signal"
                aria-label="Refresh weather"
                title="Refresh weather"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LOCATIONS.map((location) => (
                <button
                  key={location.name}
                  type="button"
                  onClick={() => setSelectedLocation(location)}
                  className={`min-h-11 rounded-md border px-3 text-sm font-semibold transition ${
                    selectedLocation.name === location.name
                      ? "border-signal bg-signal text-white"
                      : "border-mist bg-white text-slate-700 hover:border-signal hover:text-signal"
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>
            <form onSubmit={submitCustomLocation} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={customLat}
                onChange={(event) => setCustomLat(event.target.value)}
                placeholder="Latitude"
                className="h-11 rounded-md border border-mist bg-cloud px-3 text-sm outline-none ring-signal/20 transition focus:border-signal focus:ring-4"
              />
              <input
                value={customLon}
                onChange={(event) => setCustomLon(event.target.value)}
                placeholder="Longitude"
                className="h-11 rounded-md border border-mist bg-cloud px-3 text-sm outline-none ring-signal/20 transition focus:border-signal focus:ring-4"
              />
              <button type="submit" className="min-h-11 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-signal">
                Apply
              </button>
            </form>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-md border border-mist bg-cloud px-3 py-3 text-sm">
              <span className="font-medium text-ink">AI summaries</span>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(event) => setAiEnabled(event.target.checked)}
                className="h-5 w-5 accent-signal"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-96 items-center justify-center rounded-lg border border-mist bg-white">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-signal" aria-hidden="true" />
              Loading WeatherAI data
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-berry/20 bg-berry/10 p-6 text-berry">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        ) : weather ? (
          <div className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-lg border border-mist bg-white p-5 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <MapPin className="h-4 w-4 text-signal" aria-hidden="true" />
                      {weather.location.name ?? `${weather.location.lat.toFixed(2)}, ${weather.location.lon.toFixed(2)}`}
                    </p>
                    <h2 className="mt-3 text-5xl font-semibold text-ink">{formatNumber(weather.current.temp, "°")}</h2>
                    <p className="mt-2 text-base text-slate-600">{weather.current.description ?? "Current conditions unavailable"}</p>
                  </div>
                  <div className="rounded-md border border-mist bg-cloud px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {metricRow("Feels like", formatNumber(weather.current.feelsLike, "°"), <Thermometer className="h-4 w-4" />)}
                  {metricRow("Humidity", formatNumber(weather.current.humidity, "%"), <Droplets className="h-4 w-4" />)}
                  {metricRow("Wind", formatNumber(weather.current.windSpeed, " km/h"), <Wind className="h-4 w-4" />)}
                  {metricRow("Updated", weather.current.updatedAt ?? "Data unavailable", <Gauge className="h-4 w-4" />)}
                </div>
              </article>

              <article className="rounded-lg border border-mist bg-ink p-5 text-white shadow-panel">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  AI summary
                </div>
                <p className="mt-5 text-2xl font-semibold leading-9">{summary}</p>
                <p className="mt-5 text-sm text-slate-300">Powered by WeatherAI data.</p>
              </article>
            </div>

            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">Decision Cards</h2>
                  <p className="mt-1 text-sm text-slate-600">Local rules interpret the latest weather signals into planning guidance.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {decisions.map((decision) => {
                  const Icon =
                    decision.title === "Travel Readiness"
                      ? Plane
                      : decision.title === "Outdoor Activity"
                        ? Activity
                        : decision.title === "Farming/Gardening Advisory"
                          ? Leaf
                          : ShieldCheck;

                  return (
                    <article key={decision.title} className="rounded-lg border border-mist bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${toneClasses[decision.tone]}`}>
                          {decision.verdict}
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-ink">{decision.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{decision.rationale}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-ink">Seven-Day Forecast</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {weather.forecast.length ? (
                  weather.forecast.map((day, index) => <ForecastCard key={`${day.date ?? "day"}-${index}`} day={day} index={index} />)
                ) : (
                  <div className="rounded-lg border border-mist bg-white p-5 text-sm text-slate-600">Forecast data unavailable.</div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-mist bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-ink">API Usage</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {usage?.available
                      ? "WeatherAI quota details from the usage endpoint."
                      : "Usage data unavailable, but weather data is working."}
                  </p>
                </div>
                {usage?.available ? (
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md bg-cloud px-4 py-3">
                      <p className="text-slate-500">Used</p>
                      <p className="font-semibold text-ink">{formatNumber(usage.requestsUsed)}</p>
                    </div>
                    <div className="rounded-md bg-cloud px-4 py-3">
                      <p className="text-slate-500">Remaining</p>
                      <p className="font-semibold text-ink">{formatNumber(usage.requestsRemaining)}</p>
                    </div>
                    <div className="rounded-md bg-cloud px-4 py-3">
                      <p className="text-slate-500">Plan</p>
                      <p className="font-semibold text-ink">{usage.plan ?? "Data unavailable"}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-mist bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
        WeatherWise demo project for the WeatherAI API integration challenge.
      </footer>
    </main>
  );
}
