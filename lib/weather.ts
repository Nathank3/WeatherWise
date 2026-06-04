export type WeatherCondition = {
  date?: string;
  temp?: number;
  feelsLike?: number;
  high?: number;
  low?: number;
  description?: string;
  humidity?: number;
  windSpeed?: number;
  rainProbability?: number;
  precipitation?: number;
  visibility?: number;
  updatedAt?: string;
};

export type NormalizedWeather = {
  location: {
    name?: string;
    lat: number;
    lon: number;
  };
  units: string;
  current: WeatherCondition;
  forecast: WeatherCondition[];
  aiSummary?: string;
  rawShape: string[];
};

export type NormalizedUsage = {
  requestsUsed?: number;
  requestsRemaining?: number;
  requestsLimit?: number;
  aiRequestsUsed?: number;
  aiRequestsRemaining?: number;
  aiRequestsLimit?: number;
  plan?: string;
  resetAt?: string;
  available: boolean;
};

type JsonObject = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function pickRecord(source: JsonObject, keys: string[]): JsonObject | undefined {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function pickArray(source: JsonObject, keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return undefined;
}

function pickString(source: JsonObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = asString(source[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function pickNumber(source: JsonObject, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = asNumber(source[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizeCondition(input: unknown): WeatherCondition {
  if (!isRecord(input)) {
    return {};
  }

  const condition = pickRecord(input, ["condition", "weather"]);

  return {
    date: pickString(input, ["date", "day", "time", "timestamp", "datetime"]),
    temp: pickNumber(input, ["temp", "temperature", "temperature_c", "temperatureC", "current_temp"]),
    feelsLike: pickNumber(input, ["feels_like", "feelsLike", "apparent_temperature", "apparentTemperature"]),
    high: pickNumber(input, ["high", "temp_max", "max_temp", "temperatureMax", "temperature_max"]),
    low: pickNumber(input, ["low", "temp_min", "min_temp", "temperatureMin", "temperature_min"]),
    description:
      pickString(input, ["summary", "description", "condition", "text"]) ??
      (condition ? pickString(condition, ["summary", "description", "text", "main"]) : undefined),
    humidity: pickNumber(input, ["humidity", "relative_humidity", "relativeHumidity"]),
    windSpeed: pickNumber(input, ["wind_speed", "windSpeed", "wind_kph", "windKph", "wind"]),
    rainProbability: pickNumber(input, [
      "rain_probability",
      "rainProbability",
      "precipitation_probability",
      "precipitationProbability",
      "pop",
    ]),
    precipitation: pickNumber(input, ["precipitation", "precip_mm", "rain", "rain_mm"]),
    visibility: pickNumber(input, ["visibility", "visibility_km", "visibilityKm"]),
    updatedAt: pickString(input, ["updated_at", "updatedAt", "last_updated", "lastUpdated", "observed_at"]),
  };
}

function findCurrent(root: JsonObject): WeatherCondition {
  const data = pickRecord(root, ["data", "weather", "result"]) ?? root;
  const current = pickRecord(data, ["current", "now", "conditions"]) ?? data;
  return normalizeCondition(current);
}

function findForecast(root: JsonObject): WeatherCondition[] {
  const data = pickRecord(root, ["data", "weather", "result"]) ?? root;
  const forecast =
    pickArray(data, ["daily", "forecast", "days", "forecast_days", "forecastDays"]) ??
    (pickRecord(data, ["forecast"]) ? pickArray(pickRecord(data, ["forecast"])!, ["daily", "days"]) : undefined);

  return (forecast ?? []).map(normalizeCondition).slice(0, 7);
}

function findLocation(root: JsonObject, lat: number, lon: number) {
  const data = pickRecord(root, ["data", "weather", "result"]) ?? root;
  const location = pickRecord(data, ["location", "place", "geo"]) ?? {};

  return {
    name:
      pickString(location, ["name", "city", "label", "formatted"]) ??
      pickString(data, ["location_name", "locationName", "city", "timezone"]),
    lat,
    lon,
  };
}

function findAiSummary(root: JsonObject): string | undefined {
  const data = pickRecord(root, ["data", "weather", "result"]) ?? root;
  const ai = pickRecord(data, ["ai", "summary_ai", "assistant"]);

  return (
    pickString(data, ["ai_summary", "aiSummary", "summary", "narrative"]) ??
    (ai ? pickString(ai, ["summary", "text", "narrative"]) : undefined)
  );
}

export function normalizeWeatherResponse(input: unknown, lat: number, lon: number, units: string): NormalizedWeather {
  if (!isRecord(input)) {
    return {
      location: { lat, lon },
      units,
      current: {},
      forecast: [],
      rawShape: [],
    };
  }

  return {
    location: findLocation(input, lat, lon),
    units,
    current: findCurrent(input),
    forecast: findForecast(input),
    aiSummary: findAiSummary(input),
    rawShape: Object.keys(input),
  };
}

export function normalizeUsageResponse(input: unknown): NormalizedUsage {
  if (!isRecord(input)) {
    return { available: false };
  }

  const data = pickRecord(input, ["data", "usage", "quota", "result"]) ?? input;
  const period = pickRecord(data, ["period", "billingPeriod", "window"]);
  const limits = pickRecord(data, ["limits", "limit", "quota"]);
  const remaining = pickRecord(data, ["remaining", "remainingQuota"]);

  return {
    requestsUsed:
      pickNumber(data, ["requests_used", "requestsUsed", "used", "count", "total_requests"]) ??
      (period ? pickNumber(period, ["requestCount", "requests", "requests_used", "used"]) : undefined),
    requestsRemaining:
      pickNumber(data, ["requests_remaining", "requestsRemaining", "remaining", "remaining_requests"]) ??
      (remaining ? pickNumber(remaining, ["requests", "requestCount", "requestsRemaining"]) : undefined),
    requestsLimit:
      pickNumber(data, ["requests_limit", "requestsLimit", "limit", "requestLimit"]) ??
      (limits ? pickNumber(limits, ["requests", "requestLimit", "requestsLimit"]) : undefined),
    aiRequestsUsed:
      pickNumber(data, ["ai_requests_used", "aiRequestsUsed", "ai_used"]) ??
      (period ? pickNumber(period, ["aiRequestCount", "aiRequests", "ai_requests_used"]) : undefined),
    aiRequestsRemaining:
      pickNumber(data, ["ai_requests_remaining", "aiRequestsRemaining", "ai_remaining"]) ??
      (remaining ? pickNumber(remaining, ["aiRequests", "aiRequestCount", "aiRequestsRemaining"]) : undefined),
    aiRequestsLimit:
      pickNumber(data, ["ai_requests_limit", "aiRequestsLimit", "aiLimit"]) ??
      (limits ? pickNumber(limits, ["aiRequests", "aiRequestLimit", "aiRequestsLimit"]) : undefined),
    plan: pickString(data, ["plan", "tier", "subscription"]),
    resetAt: pickString(data, ["reset_at", "resetAt", "period_end", "periodEnd"]) ?? (period ? pickString(period, ["end", "resetAt"]) : undefined),
    available: true,
  };
}
