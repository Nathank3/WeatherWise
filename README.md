# WeatherWise

WeatherWise is a smart weather decision dashboard built with the WeatherAI API. It converts real-time weather and forecast data into practical planning insights for travel, outdoor activities, farming/gardening, and daily risk awareness.

## Features

- Current weather overview with temperature, feels-like, humidity, wind, condition, and last-updated fields when available.
- Seven-day forecast display capped at the free-plan-friendly limit of 7 days.
- AI summary panel powered by WeatherAI data, with a local fallback summary when the API does not return one.
- Practical decision cards for travel readiness, outdoor activity, farming/gardening, and weather risk level.
- Preset global locations plus custom latitude and longitude entry.
- Optional AI summaries toggle using `ai=false` to preserve quota.
- WeatherAI usage/quota card showing plan, reset date, request usage, remaining quota, limits, and AI quota when available.
- Server-side API routes so the WeatherAI API key is never exposed in browser code.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide React icons
- WeatherAI API
- Vercel-ready deployment model

## WeatherAI Endpoints Used

- `GET /v1/weather`
- `GET /v1/usage`

The app uses only all-plan WeatherAI endpoints. Forecast requests are capped at 7 days.

## Environment Variables

### Getting A WeatherAI API Key

1. Go to [https://weather-ai.co/](https://weather-ai.co/).
2. Create an account or sign in.
3. Open the developer/API dashboard.
4. Generate a new API key.
5. Copy the key and use it as `WEATHER_AI_API_KEY` in your local `.env` file or Vercel environment variables.

Keep this key private. Do not paste the real key into frontend code, screenshots, public issues, or committed files.

Create a local `.env` file:

```bash
WEATHER_AI_API_KEY=your_weatherai_key_here
```

The included `.env.example` shows the required variable name. The real `.env` file is ignored by Git.

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a preset location or enter custom coordinates.

## Publishing To GitHub

If the project is already on your local machine but not yet on GitHub, follow these steps:

1. Create a new empty repository on GitHub.
   - Go to [https://github.com/new](https://github.com/new).
   - Give it a name, for example `WeatherWise`.
   - Do not add a README, `.gitignore`, or license on GitHub if this local project already has those files.
   - Click **Create repository**.

2. Open a terminal in the project folder.

```bash
cd path/to/weather-wise
```

3. Initialize Git if the folder is not already a Git repository.

```bash
git init
git branch -M main
```

4. Check that `.env` is ignored before committing.

```bash
git status
```

The `.env` file should not appear in the files to be committed. This matters because `.env` contains the private WeatherAI API key.

5. Add and commit the project files.

```bash
git add .
git commit -m "Initial WeatherWise project"
```

6. Connect the local project to the GitHub repository.

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY_NAME` with your real GitHub username and repository name:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
```

7. Push the project to GitHub.

```bash
git push -u origin main
```

After the push finishes, refresh the GitHub repository page. The project files should now be visible there.

## Deployment To Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add `WEATHER_AI_API_KEY` in the Vercel project environment variables.
4. Deploy with the default Next.js settings.

## API-Key Safety

WeatherAI requests are made only from server-side routes under `/api/weather` and `/api/usage`. The frontend calls those local routes and never receives the raw API key. Do not commit `.env`, `.env.local`, or any file containing real credentials.

## Notes On API Shape

WeatherWise includes a normalization helper because third-party weather APIs can vary field names across responses. The helper checks common names for current weather, forecast days, locations, AI summaries, and usage values, including nested usage fields such as period counts, limits, and remaining quota. If fields are missing, the UI shows friendly fallback text instead of crashing.

## Future Improvements

- Map-based location search
- User-saved locations
- Weather alerts
- Historical weather comparison
- Forestry/tree analysis integration
- Progressive Web App support
