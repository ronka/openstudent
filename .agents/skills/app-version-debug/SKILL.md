---
name: app-version-debug
description: Add or update app version display and hidden debug menu in Expo/React Native settings screens. Use when adding a settings screen with version info, setting up version bump scripts for EAS builds/updates, adding a hidden debug menu (triple-tap to reveal), or when the user asks to add debug options, version display, or OTA update version tracking to their app. Triggers on settings screen, version display, debug menu, hidden menu, app version, UPDATE_VERSION, bump version.
---

# App Version & Debug Menu

Add version display and a hidden debug menu to Expo React Native apps. Two-part version: semver from `app.json` + OTA update counter in settings screen.

## Workflow

### 1. Check existing state

Search the project for:
- `UPDATE_VERSION` constant in any settings/screen file
- `bump-app-version` or `increment-update-version` in `scripts/` or `package.json`
- A settings screen displaying app version

If found, update the existing implementation. If missing, add it.

### 2. Version bump scripts

Copy scripts from this skill's `scripts/` directory into the project's `scripts/` folder:
- `scripts/bump-app-version.js` — increments patch version in `app.json` (run before production builds)
- `scripts/increment-update-version.js` — increments `UPDATE_VERSION` in the settings file (run before OTA updates)

Add npm scripts to `package.json` if missing:

```json
{
  "update": "node scripts/increment-update-version.js && npx eas update",
  "build:production:ios": "node scripts/bump-app-version.js && npx eas build --platform ios --profile production",
  "build:production:android": "node scripts/bump-app-version.js && npx eas build --platform android --profile production"
}
```

### 3. Settings screen version display

Add to the settings screen:
- `const UPDATE_VERSION = 1` at top level
- Version string: `Constants.expoConfig?.version + '-' + UPDATE_VERSION`
- Display in an "App Details" / "פרטי האפליקציה" row

Requires `expo-constants` — install if missing.

### 4. Hidden debug menu

Add triple-tap handler on the version row that shows an Alert with debug options. See [debug-menu-pattern.md](references/debug-menu-pattern.md) for the complete implementation pattern including:
- Tap counter with 500ms timeout using refs
- `showDebugOptions()` callback with Alert.alert
- Cleanup in useEffect return

Default debug options to include:
- **Reset onboarding** — clear onboarding state so it re-shows
- **Notification lab** — navigate to a notification test screen (if it exists)

Add more options as needed for the specific project.

## Adding new debug options

To add a new option to an existing debug menu, add an entry to the Alert buttons array in `showDebugOptions()` before the cancel button.
