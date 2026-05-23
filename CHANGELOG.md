# Changelog

## MVP 2.7 Stable - 2026-05-24

This stable snapshot focuses on restoring older MVP functionality while cleaning up the home UI and feature access patterns.

### Added

- Clean MVP 2.7 home screen with Dino, Level, XP, Streak, and a main relief journey button.
- Four circular feature buttons for Level Progress, Character Closet, Gentle Reminder, and Achievements.
- Safe-area-aware feature panels that avoid the iOS Dynamic Island, status bar, and Home Indicator.
- Restored mood selection flow with Happy, Calm, Tired, Anxious, and Angry.
- Restored Deer Recovery Training as an independent relief scene.
- Gentle Reminder panel with free time selection, iOS spinner picker, Web fallback picker, and time-of-day visual animation.
- Componentized MVP 2.7 UI files under `components/`.

### Fixed

- Fixed Gentle Reminder animation crash caused by mixing JS-driven and native-driven Animated nodes.
- Preserved XP, Streak, Mood History, Character Closet, and Achievement reward behavior through the existing completion pipeline.

### Validation

- `npx tsc --noEmit`
- `npx expo start --port 8091`
