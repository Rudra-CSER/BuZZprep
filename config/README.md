# Configuration bundles

A configuration bundle is a JSON file that describes a preparation setup: profile settings, plan and milestones, learning tracks, the weekly routine, reminders, habits and target companies. The setup wizard produces one, **Profile → Export configuration** downloads yours, and you can import one into any account.

Bundles are how personal defaults reach the app without being part of its source code.

## Files in this folder

| File               | What it is                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `example.sde.json` | The SDE interview template with its default answers. Safe to share; contains no personal data.                    |
| `*.local.json`     | **Your** bundles, for example `personal.local.json`. Ignored by git, so they never end up in a public repository. |

In the Docker setup this folder is mounted read-only into the container at `/config`.

## Importing

In the app: **Profile → Import configuration**, choose the file, then **Replace** or **Merge**.

From the command line (the account must already exist):

```bash
# local development
npm run config:import -- --email you@example.com --file config/personal.local.json

# Docker
docker compose exec app node apps/server/dist/import-config.js --email you@example.com --file /config/personal.local.json
```

| Mode                | Effect                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `replace` (default) | The bundle's plan becomes your active plan (the previous one is archived). Its routine is added and becomes the active one (your previous routine is kept, inactive). Its standalone reminders replace yours. |
| `merge`             | The plan is added as paused if you already have an active plan. The routine is added as an inactive schedule (or the active one if you have none). Reminders are added.                                       |

In both modes, profile settings in the bundle overwrite yours, and tracks, habits and companies are added only if you don't already have one with the same name.

Imports never touch journal entries, completed sessions, problem logs or any other history. Reminders are re-planned immediately after an import in the app, or within 10 minutes after a command-line import.

Before importing someone else's bundle, check `profile.timezone`: it changes the time zone your whole schedule is interpreted in.

## Format

```jsonc
{
  "format": "buzzprep.config", // required
  "version": 1, // required
  "name": "SDE interview preparation",
  "profile": {
    "timezone": "Asia/Kolkata",
    "work": { "enabled": true, "days": [1, 2, 3, 4, 5], "start": "11:00", "end": "18:00" },
    "sleep": { "currentBedtime": "02:30", "targetBedtime": "01:15", "targetWake": "08:45" },
    "notifications": { "quietHours": { "enabled": true, "start": "01:30", "end": "08:30" } },
    // …any profile field, all optional
  },
  "plan": {
    "title": "Become interview-ready for SDE-1 roles",
    "startDate": "2026-11-16",
    "deadline": "2027-05-15",
    "targetCompanies": ["Company A"],
    "milestones": [{ "title": "Arrays to binary search revised", "dueDate": "2026-12-17" }],
  },
  "tracks": [
    {
      "ref": "dsa",
      "title": "DSA",
      "kind": "dsa",
      "topics": [{ "title": "Arrays", "type": "concept", "resources": [] }],
    },
  ],
  "schedule": {
    "name": "My routine",
    "activities": [
      {
        "ref": "session_main",
        "title": "DSA deep work",
        "category": "dsa",
        "trackRef": "dsa",
        "startTime": "19:00",
        "durationMinutes": 70,
        "recurrence": {
          "freq": "weekly",
          "interval": 1,
          "byWeekday": [1, 2, 3, 4, 5],
          "startDate": "2026-11-16",
        },
      },
    ],
  },
  "reminders": [
    {
      "kind": "upcoming",
      "anchor": "activity_start",
      "activityRef": "session_main",
      "offsetMinutes": -10,
    },
    {
      "kind": "missed_digest",
      "anchor": "time",
      "time": "21:35",
      "recurrence": { "freq": "daily", "interval": 1, "startDate": "2026-11-16" },
    },
  ],
  "habits": [{ "name": "DSA practice", "targetPerWeek": 5, "linkedCategory": "dsa" }],
  "career": {
    "applications": [{ "company": "Company A", "tier": "target", "stage": "interested" }],
  },
  "setup": {/* the setup wizard's answers; enables "Reset to default schedule" */},
}
```

- **Refs, not ids.** Activities and tracks have a `ref` (letters, digits, `_` and `-`). Reminders point at activities with `activityRef`; activities point at tracks with `trackRef`. Refs must be unique within their list, and every reference must resolve; the importer reports the exact path of any problem.
- **Times and dates** are local: `HH:mm` and `YYYY-MM-DD`, in the profile's time zone. Weekdays are numbered 1 (Monday) to 7 (Sunday).
- The full schema is `configBundleSchema` in `packages/shared/src/schemas/bundle.ts`. `example.sde.json` shows every section filled in.

## Making your own

The easiest way is to answer the setup wizard, adjust the routine in the app, then **Profile → Export configuration** and save the file as `config/<name>.local.json`. Edit it by hand if you like, and re-import it on a new server or after starting over.
