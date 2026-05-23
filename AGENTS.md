# Dino Calm Codex Instructions

## Expo SDK 54

Read the exact versioned Expo docs at https://docs.expo.dev/versions/v54.0.0/ before writing any app code.

Use `npx expo install` for Expo-related dependencies.

Prefer the Expo plugin/skills when working on Expo, React Native, EAS, native module, deployment, or notification tasks.

## Project

Dino Calm / 小恐龙松一口气 is an Expo + React Native + TypeScript single-page emotional companion app.

It is not a medical product. Do not describe it as diagnosis, treatment, psychotherapy, or clinical care.

Design direction:
- Gentle, healing, cute, low-pressure.
- Chinese and English copy are both acceptable.
- Card-style single-page state flow.
- Lightweight React Native `Animated` motion; avoid intense or overstimulating feedback.

Current stack:
- Expo SDK 54.
- React Native 0.81.
- React 19.
- TypeScript strict mode.
- AsyncStorage local persistence.
- `react-native-safe-area-context`.
- `expo-notifications`.
- No backend.
- No real login; only mock login.
- Single-page state flow; avoid introducing complex routing unless the user asks.

## Storage Keys

Do not rename or remove these AsyncStorage keys unless you also implement a migration:

```ts
const STORAGE_KEYS = {
  hasLoggedIn: 'dino-calm-has-logged-in',
  hasSeenOnboarding: 'dino-calm-has-seen-onboarding',
  hasCompletedPreferenceSetup: 'dino-calm-has-completed-preference-setup',
  userPreferences: 'dino-calm-user-preferences',
  xp: 'dino-calm-xp',
  streak: 'dino-calm-streak',
  lastCompletedDate: 'dino-calm-last-completed-date',
  moodHistory: 'dino-calm-mood-history',
  achievements: 'dino-calm-achievements',
};
```

## Reward Rules

Preserve these rules:
- First relief completion of the day: `+10 XP` and `Streak +1`.
- Later relief completions on the same day: `+5 XP`.
- Streak increases at most once per day.
- XP can increase multiple times per day.
- Mood History records only the first formal completion of the day.
- Mood History records `reliefMethod`, `recommendationSource`, and `wasTopPick`.

Do not bypass `completeTask()` or `recordReliefCompletion()` when changing XP, Streak, or Mood History behavior.

## Domain Model

Supported moods:
- `Happy`
- `Calm`
- `Tired`
- `Anxious`
- `Angry`
- `Sad`

Dino states:
- `calm`
- `happy`
- `grumpy`
- `healing`

Default user preferences:

```ts
{
  favoriteReliefMethods: ['coffee', 'meditation', 'recovery'],
  reminderTime: '20:00',
  supportStyle: 'encouragement',
  stressTime: 'evening',
}
```

## Architecture

The app is a single-page state machine plus componentized relief scenes.

`App.tsx` owns business state, persistence, navigation state, and completion flow:
- `currentStep`
- `selectedMood`
- `userPreferences`
- `xp`
- `streak`
- `lastCompletedDate`
- `moodHistory`
- `unlockedAchievementIds`
- task-specific timer and progress state

Scene components own UI and animation only. They notify `App.tsx` through callbacks and must not directly mutate XP, Streak, Mood History, or AsyncStorage.

Important modules:
- `components/recommendations.ts`: recommendation types, `getPersonalizedRecommendations()`, and `recordReliefCompletion()`.
- `components/daily-reminder.tsx`: Expo Notifications handler; skip notification scheduling on Web.
- `components/achievements.tsx`: achievement definitions, unlock logic, accessory mapping, and list UI.
- `components/coffee-scene.tsx`: Coffee with Dino scene; completion should flow to `completeTask('coffee')`.
- `components/meditation-scene.tsx`: Meditation with Dino scene; completion should flow to `completeTask('meditation')`.
- `components/deer-recovery-scene.tsx`: Deer Recovery scene; completion should flow to `completeTask('recovery', selectedRecoveryTraining.key)`.
- `components/dino-avatar.tsx`: Dino avatar states and accessories.

Prefer new feature components under `components/` instead of further growing `App.tsx`.

## Notifications

When touching `expo-notifications`:
- Verify the SDK 54 docs first.
- Web must skip local notification scheduling.
- When the user has already completed today's check-in, cancel or avoid scheduling the reminder.
- Preserve custom reminder times: `09:00`, `15:00`, `20:00`, `22:00`.

Manual verification still needed before release:
- iOS simulator or device run.
- Android simulator or device run.
- Notification permission prompt.
- Scheduled reminder behavior when the day is incomplete.
- Reminder cancellation or suppression after completion.

## Current Milestone

Current target version: MVP 2.4.0.

Already implemented:
- Login mock, onboarding, preference setup, home, mood check, dino state, personalized recommendations.
- Coffee with Dino, Recovery Training with Deer, Meditation with Dino, Breathing Balloon, Pop Stress Bubbles.
- Complete flow, Mood History, About.
- Top Pick UI and personalized completion metadata.
- Expo Notifications local reminder foundation.
- Achievements, XP, Streak, and accessory mapping.
- Scene components for coffee, meditation, and deer recovery.

Before changing release metadata, note that `package.json`, `package-lock.json`, and `app.json` currently track version `2.4.0`.

## Validation

Known previous checks:
- `npx tsc --noEmit`
- `npm run web -- --port 8090`
- `curl -I http://localhost:8090`
- `npm start -- --port 8091`
- `curl -I http://localhost:8091`

Run focused validation for the files you change. For reward, recommendation, notification, or persistence changes, include a typecheck and a manual or scripted check of the affected completion path.
