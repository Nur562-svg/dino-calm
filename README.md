# Dino Calm / 小恐龙松一口气

Dino Calm is an Expo + React Native emotional companion app where a tiny dino helps users check in with their mood and take small calming steps.

Dino Calm 是一款轻量情绪陪伴 App。用户可以每天选择心情，通过温柔的放松练习帮助小恐龙释放压力。完成任务后，小恐龙会恢复开心，用户获得 XP、Streak，并记录情绪历史。随着 XP 增加，小恐龙会升级并解锁小装饰。

## Core Idea

Many students and young people experience stress, anxiety, and emotional fatigue in daily life. Dino Calm provides a lightweight, friendly companion that makes stress relief feel small, repeatable, and approachable.

The app is not a medical product. It does not provide diagnosis, treatment, psychotherapy, or clinical care.

## Core Features

- MVP 2.7 clean Duolingo-style home screen
- Dino companion interface
- Mood Check 心情选择
- Preference Onboarding 偏好问卷
- Personalized relief recommendations 个性化解压推荐
- Dino emotion states 小恐龙情绪状态
- Coffee with Dino 和小恐龙喝咖啡
- Recovery Training with Deer 和小鹿做康复训练
- Meditation with Dino 和小恐龙冥想
- Breathing Balloon 呼吸气球
- Pop Stress Bubbles 戳压力泡泡
- Gentle Reminder 温柔提醒
- XP and Streak 经验值与连胜
- Dino Level 小恐龙成长系统
- Character Closet 角色衣柜
- Achievements 成就系统
- Mood History 情绪记录
- Login Mock 登录入口 Mock
- About / Safety note 关于与安全说明

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- AsyncStorage
- expo-notifications
- lottie-react-native
- @react-native-community/datetimepicker
- @react-three/fiber / three / expo-gl

## Safety Note

Dino Calm is a gentle self-care and emotional companion app. It is not a medical or therapy service.

Dino Calm 不提供医疗诊断、治疗、心理诊断或心理治疗服务，它只是一个轻量自我照顾与情绪陪伴工具。

## Install

```bash
npm install
```

## Run

```bash
npx expo start
```

## Validation

```bash
npx tsc --noEmit
npx expo start
```

## Demo Flow

First launch:

- Login Mock
- Onboarding
- Preference Onboarding
- Home
- Mood Check
- Dino recommendations
- Favorite Relief / Recovery Training / Meditation
- Complete

Current relief demos:

- Coffee with Dino
- Recovery Training with Deer
- Meditation with Dino
- Breathing Balloon
- Pop Stress Bubbles

Placeholder relief demos:

- Walk with Dino
- Game Break
- Listen with Dino

## AsyncStorage Keys

- `dino-calm-has-logged-in`
- `dino-calm-has-seen-onboarding`
- `dino-calm-has-completed-preference-setup`
- `dino-calm-user-preferences`
- `dino-calm-xp`
- `dino-calm-streak`
- `dino-calm-last-completed-date`
- `dino-calm-mood-history`
- `dino-calm-last-selected-mood`
- `dino-calm-achievements`
- `dino-calm-character-unlocks`

## Brand Assets

The current brand assets are generated locally with:

```bash
npm run generate:assets
```

Generated files:

- `assets/icon.png`
- `assets/adaptive-icon.png`
- `assets/splash-icon.png`
- `assets/favicon.png`

## Project Vision

Dino Calm hopes to become a small but meaningful emotional support tool. It is a warm digital companion that encourages users to take care of their emotional state step by step.

## Version History

See [CHANGELOG.md](./CHANGELOG.md).

## Author

Created by Nuradil / Nuke AB.
