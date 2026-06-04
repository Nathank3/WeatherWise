import type { NormalizedWeather, WeatherCondition } from "./weather";

export type DecisionTone = "positive" | "warning" | "danger";

export type DecisionCard = {
  title: string;
  verdict: string;
  tone: DecisionTone;
  rationale: string;
};

function maxNumber(values: Array<number | undefined>): number | undefined {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finite.length ? Math.max(...finite) : undefined;
}

function minNumber(values: Array<number | undefined>): number | undefined {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finite.length ? Math.min(...finite) : undefined;
}

function tempFor(condition: WeatherCondition): number | undefined {
  return condition.high ?? condition.temp;
}

export function createFallbackSummary(weather: NormalizedWeather): string {
  const temp = weather.current.temp;
  const description = weather.current.description ?? "weather conditions";
  const wind = weather.current.windSpeed;
  const rain = weather.current.rainProbability;
  const location = weather.location.name ?? `${weather.location.lat.toFixed(2)}, ${weather.location.lon.toFixed(2)}`;

  const details = [
    typeof temp === "number" ? `${Math.round(temp)} degrees` : undefined,
    typeof wind === "number" ? `winds near ${Math.round(wind)} km/h` : undefined,
    typeof rain === "number" ? `${Math.round(rain)}% rain probability` : undefined,
  ].filter(Boolean);

  return `WeatherWise sees ${description.toLowerCase()} for ${location}${details.length ? `, with ${details.join(", ")}` : ""}.`;
}

export function buildDecisionCards(weather: NormalizedWeather): DecisionCard[] {
  const conditions = [weather.current, ...weather.forecast.slice(0, 2)];
  const highestRain = maxNumber(conditions.map((condition) => condition.rainProbability));
  const highestPrecip = maxNumber(conditions.map((condition) => condition.precipitation));
  const strongestWind = maxNumber(conditions.map((condition) => condition.windSpeed));
  const hottestTemp = maxNumber(conditions.map(tempFor));
  const lowestTemp = minNumber(conditions.map((condition) => condition.low ?? condition.temp));
  const stormSignal = conditions.some((condition) => /storm|thunder|squall|severe/i.test(condition.description ?? ""));

  // Thresholds are intentionally simple and explainable for a demo dashboard.
  const rainRisk = (highestRain ?? 0) >= 70 || (highestPrecip ?? 0) >= 8;
  const windRisk = (strongestWind ?? 0) >= 35;
  const heatRisk = (hottestTemp ?? 0) >= 32;
  const coldRisk = lowestTemp !== undefined && lowestTemp <= 5;
  const riskFactors = [rainRisk, windRisk, heatRisk, coldRisk, stormSignal].filter(Boolean).length;

  return [
    {
      title: "Travel Readiness",
      verdict: riskFactors >= 3 || stormSignal ? "Avoid" : riskFactors >= 1 ? "Caution" : "Good",
      tone: riskFactors >= 3 || stormSignal ? "danger" : riskFactors >= 1 ? "warning" : "positive",
      rationale:
        riskFactors >= 3 || stormSignal
          ? "Several weather signals could make travel unreliable today."
          : riskFactors >= 1
            ? "Plan buffer time and check conditions before leaving."
            : "No major weather constraints are visible in the current data.",
    },
    {
      title: "Outdoor Activity",
      verdict: rainRisk || stormSignal ? "Not Ideal" : windRisk || heatRisk || coldRisk ? "Manageable" : "Great",
      tone: rainRisk || stormSignal ? "danger" : windRisk || heatRisk || coldRisk ? "warning" : "positive",
      rationale:
        rainRisk || stormSignal
          ? "Rain or storm signals may interrupt outdoor plans."
          : windRisk || heatRisk || coldRisk
            ? "Conditions are workable with timing, hydration, and wind awareness."
            : "The available forecast supports comfortable outdoor activity.",
    },
    {
      title: "Farming/Gardening Advisory",
      verdict: windRisk || stormSignal ? "Avoid spraying or outdoor work" : heatRisk && !rainRisk ? "Irrigation may be needed" : "Good for field work",
      tone: windRisk || stormSignal ? "danger" : heatRisk && !rainRisk ? "warning" : "positive",
      rationale:
        windRisk || stormSignal
          ? "Wind or storm-like conditions can reduce safety and spraying accuracy."
          : heatRisk && !rainRisk
            ? "Heat without meaningful rain suggests soil moisture may need attention."
            : "Current signals look suitable for routine field or garden tasks.",
    },
    {
      title: "Weather Risk Level",
      verdict: riskFactors >= 3 ? "High" : riskFactors >= 1 ? "Moderate" : "Low",
      tone: riskFactors >= 3 ? "danger" : riskFactors >= 1 ? "warning" : "positive",
      rationale:
        riskFactors >= 3
          ? "Multiple caution thresholds are active in the latest weather data."
          : riskFactors >= 1
            ? "At least one condition deserves attention while planning."
            : "No major risk threshold is active from the available data.",
    },
  ];
}
