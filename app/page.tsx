"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CloudSun,
  Compass,
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
  positive: "border-signal/25 bg-signal/10 text-signal",
  warning: "border-sunbeam/40 bg-sunbeam/20 text-amberline",
  danger: "border-berry/25 bg-berry/10 text-berry",
};

const toneGlow: Record<DecisionCard["tone"], string> = {
  positive: "from-signal/20 to-skywise/10",
  warning: "from-sunbeam/25 to-amberline/10",
  danger: "from-berry/20 to-violetline/10",
};

function formatNumber(value: number | undefined, suffix = "") {
  return typeof value === "number" ? `${Math.round(value)}${suffix}` : "Data unavailable";
}

function formatUsageValue(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "Not reported";
}

function formatResetDate(value: string | undefined) {
  if (!value) {
    return "Not reported";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
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
    <div className="flex min-h-14 items-center gap-3 rounded-md border border-white/70 bg-white/75 px-3 py-2 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-skywise to-signal text-white shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function ForecastCard({ day, index }: { day: WeatherCondition; index: number }) {
  return (
    <article className="group relative overflow-hidden rounded-lg border border-white/70 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="signal-band absolute inset-x-0 top-0 h-1" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{formatDay(day.date, index)}</p>
          <p className="mt-1 min-h-10 text-sm font-medium text-slate-700">{day.description ?? "Data unavailable"}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-skywise/10 text-skywise">
          <CloudSun className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm font-medium text-slate-800">
        <div className="flex justify-between gap-4">
          <span>High / low</span>
          <strong className="rounded-md bg-cloud px-2 py-1 text-ink">
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
      <section className="weather-grid relative overflow-hidden border-b border-white/60 bg-gradient-to-br from-ink via-[#173958] to-signal text-white">
        <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-skywise via-signal to-sunbeam" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-12">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex w-fit items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-teal-50 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              WeatherAI integration challenge
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-tight sm:text-6xl">
              Weather <span className="bg-gradient-to-r from-sunbeam via-white to-cyan-200 bg-clip-text text-transparent">Wise</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-100">
              A smart weather decision dashboard that converts real-time weather and seven-day forecast data into practical planning
              guidance for travel, outdoor activity, field work, and daily risk awareness.
            </p>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur">
                <Compass className="h-5 w-5 text-sunbeam" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">Plan routes</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur">
                <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">Read risks</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur">
                <BarChart3 className="h-5 w-5 text-teal-200" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">Track quota</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-lg p-4 text-ink shadow-panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-ink">Location command</p>
                <p className="text-sm font-medium text-slate-700">Choose a city or enter coordinates.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadWeather()}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-mist bg-white text-ink shadow-sm transition hover:border-signal hover:text-signal"
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
                      ? "border-signal bg-gradient-to-r from-skywise to-signal text-white shadow-sm"
                      : "border-mist bg-white text-slate-700 hover:border-signal hover:text-signal hover:shadow-sm"
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
                className="h-11 rounded-md border border-mist bg-white px-3 text-sm outline-none ring-signal/20 transition focus:border-signal focus:ring-4"
              />
              <input
                value={customLon}
                onChange={(event) => setCustomLon(event.target.value)}
                placeholder="Longitude"
                className="h-11 rounded-md border border-mist bg-white px-3 text-sm outline-none ring-signal/20 transition focus:border-signal focus:ring-4"
              />
              <button type="submit" className="min-h-11 rounded-md bg-gradient-to-r from-ink to-signal px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110">
                Apply
              </button>
            </form>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-md border border-skywise/20 bg-skywise/5 px-3 py-3 text-sm">
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
          <div className="flex min-h-96 items-center justify-center rounded-lg border border-white/70 bg-white/90 shadow-panel">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-800">
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
              <article className="relative overflow-hidden rounded-lg border border-white/70 bg-gradient-to-br from-white via-white to-skywise/10 p-5 shadow-panel">
                <div className="signal-band absolute inset-x-0 top-0 h-1.5" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <MapPin className="h-4 w-4 text-signal" aria-hidden="true" />
                      {weather.location.name ?? `${weather.location.lat.toFixed(2)}, ${weather.location.lon.toFixed(2)}`}
                    </p>
                    <h2 className="mt-3 text-5xl font-semibold text-ink">{formatNumber(weather.current.temp, "°")}</h2>
                    <p className="mt-2 text-base font-medium text-slate-800">{weather.current.description ?? "Current conditions unavailable"}</p>
                  </div>
                  <div className="rounded-md border border-signal/20 bg-signal/10 px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-signal">
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

              <article className="weather-grid wise-panel relative overflow-hidden rounded-lg border border-white/20 p-5 text-white shadow-panel">
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-sunbeam via-signal to-skywise" />
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Wise summary
                </div>
                <p className="mt-5 text-2xl font-semibold leading-9">{summary}</p>
                <p className="mt-5 text-sm text-slate-200">Powered by WeatherAI data.</p>
              </article>
            </div>

            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-signal">Weather into action</p>
                  <h2 className="mt-1 text-3xl font-black text-ink">Decision Cards</h2>
                  <p className="mt-1 text-sm font-medium text-slate-700">Local rules interpret the latest weather signals into planning guidance.</p>
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
                    <article
                      key={decision.title}
                      className={`relative overflow-hidden rounded-lg border border-white/70 bg-gradient-to-br ${toneGlow[decision.tone]} p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lift`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-ink shadow-sm">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold shadow-sm ${toneClasses[decision.tone]}`}>
                          {decision.verdict}
                        </span>
                      </div>
                      <h3 className="mt-5 text-base font-black text-ink">{decision.title}</h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{decision.rationale}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-skywise">Next seven days</p>
                  <h2 className="mt-1 text-3xl font-black text-ink">Forecast Outlook</h2>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {weather.forecast.length ? (
                  weather.forecast.map((day, index) => <ForecastCard key={`${day.date ?? "day"}-${index}`} day={day} index={index} />)
                ) : (
                  <div className="rounded-lg border border-white/70 bg-white p-5 text-sm font-medium text-slate-800 shadow-sm">Forecast data unavailable.</div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-white/70 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-ink">API Usage</h2>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {usage?.available
                      ? "Live WeatherAI quota details from the usage endpoint."
                      : "Usage data unavailable, but weather data is working."}
                  </p>
                  {usage?.available ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Plan {usage.plan ?? "Not reported"} · Resets {formatResetDate(usage.resetAt)}
                    </p>
                  ) : null}
                </div>
                {usage?.available ? (
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-skywise/20 bg-skywise/10 px-4 py-3">
                      <p className="font-semibold text-slate-800">Used</p>
                      <p className="text-lg font-black text-ink">{formatUsageValue(usage.requestsUsed)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">AI {formatUsageValue(usage.aiRequestsUsed)}</p>
                    </div>
                    <div className="rounded-md border border-signal/20 bg-signal/10 px-4 py-3">
                      <p className="font-semibold text-slate-800">Remaining</p>
                      <p className="text-lg font-black text-ink">{formatUsageValue(usage.requestsRemaining)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">AI {formatUsageValue(usage.aiRequestsRemaining)}</p>
                    </div>
                    <div className="rounded-md border border-sunbeam/30 bg-sunbeam/20 px-4 py-3">
                      <p className="font-semibold text-slate-800">Limit</p>
                      <p className="text-lg font-black text-ink">{formatUsageValue(usage.requestsLimit)}</p>
                      <p className="mt-1 text-xs font-medium text-slate-700">AI {formatUsageValue(usage.aiRequestsLimit)}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-mist bg-white/80 px-4 py-6 text-center text-sm font-medium text-slate-800">
        WeatherWise demo project for the WeatherAI API integration challenge.
      </footer>
    </main>
  );
}
