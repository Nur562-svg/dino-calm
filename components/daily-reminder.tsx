import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  getPersonalizedRecommendations,
  type HistoryItem,
  type StressTime,
  type TaskKind,
  type UserPreferences,
} from './recommendations';

const REMINDER_CHANNEL_ID = 'dino-calm-daily-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const DEFAULT_REMINDER_TIME_BY_STRESS_TIME: Record<StressTime, string> = {
  morning: '09:00',
  afternoon: '15:00',
  evening: '20:00',
  'before-sleep': '22:00',
};

const getCurrentTimeOfDay = (): StressTime => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }

  if (hour >= 18 && hour < 22) {
    return 'evening';
  }

  return 'before-sleep';
};

const getMostCompletedReliefMethod = (moodHistory: HistoryItem[]) => {
  const counts = moodHistory.reduce<Partial<Record<TaskKind, number>>>((currentCounts, item) => {
    currentCounts[item.reliefMethod] = (currentCounts[item.reliefMethod] ?? 0) + 1;
    return currentCounts;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as TaskKind | undefined;
};

const getMethodCopy = (method: TaskKind) => {
  if (method === 'coffee') {
    return '喝一小杯咖啡';
  }

  if (method === 'meditation') {
    return '做一小段冥想';
  }

  if (method === 'recovery') {
    return '和小鹿做放松训练';
  }

  if (method === 'bubbles') {
    return '戳几个压力泡泡';
  }

  if (method === 'walk') {
    return '轻轻散步';
  }

  if (method === 'music') {
    return '听一首温柔的歌';
  }

  return '做一次轻轻呼吸';
};

const getReminderBody = (moodHistory: HistoryItem[], userPreferences: UserPreferences) => {
  const lastMood = moodHistory[0]?.mood;
  const currentTimeOfDay = getCurrentTimeOfDay();
  const fallbackMood = lastMood ?? (userPreferences.stressTime === currentTimeOfDay ? 'Anxious' : 'Calm');
  const topRecommendation = getPersonalizedRecommendations({
    currentTimeOfDay,
    selectedMood: fallbackMood,
    userPreferences,
  })[0];
  const mostCompletedMethod = getMostCompletedReliefMethod(moodHistory);
  const recommendedMethod = topRecommendation?.id ?? mostCompletedMethod ?? 'breathing';
  const isStressTime = currentTimeOfDay === userPreferences.stressTime;

  if (mostCompletedMethod && mostCompletedMethod === recommendedMethod) {
    return `你之前常用${getMethodCopy(mostCompletedMethod)}放松，今天也可以轻轻来一次`;
  }

  if (lastMood === 'Anxious') {
    return `今天压力有点大，小恐龙建议${getMethodCopy(recommendedMethod)}`;
  }

  if (lastMood === 'Tired' || lastMood === 'Sad') {
    return `小恐龙想你啦，要不要${getMethodCopy(recommendedMethod)}？`;
  }

  if (isStressTime) {
    return `现在通常是你的压力高发时间，要不要${getMethodCopy(recommendedMethod)}？`;
  }

  if (userPreferences.supportStyle === 'quiet') {
    return `小恐龙安静地在这里，陪你${getMethodCopy(recommendedMethod)}`;
  }

  return `小恐龙在这里，今天推荐你${getMethodCopy(recommendedMethod)}`;
};

const getReminderTimeParts = (userPreferences: UserPreferences) => {
  const [rawHour, rawMinute] = (
    userPreferences.reminderTime ?? DEFAULT_REMINDER_TIME_BY_STRESS_TIME[userPreferences.stressTime]
  ).split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  ) {
    return { hour, minute };
  }

  return { hour: 20, minute: 0 };
};

const getNextReminderDate = (userPreferences: UserPreferences) => {
  const { hour, minute } = getReminderTimeParts(userPreferences);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1);
  }

  return date;
};

const cancelExistingDinoReminders = async () => {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduledNotifications
      .filter((notification) => notification.content.data?.dinoCalmReminder === true)
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
};

export const scheduleDailyReminder = async ({
  moodHistory,
  todayCompleted,
  userPreferences,
}: {
  moodHistory: HistoryItem[];
  todayCompleted: boolean;
  userPreferences: UserPreferences;
}) => {
  if (Platform.OS === 'web') {
    return null;
  }

  await cancelExistingDinoReminders();

  if (todayCompleted) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Dino Calm reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#BDEB95',
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const finalPermission =
    existingPermission.status === 'granted'
      ? existingPermission
      : await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: false,
          },
        });

  if (finalPermission.status !== 'granted') {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Dino Calm / 小恐龙松一口气',
      body: getReminderBody(moodHistory, userPreferences),
      data: {
        dinoCalmReminder: true,
        recommendedMethod: getMostCompletedReliefMethod(moodHistory) ?? 'personalized',
        source: 'daily-check-in',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: getNextReminderDate(userPreferences),
      channelId: REMINDER_CHANNEL_ID,
    },
  });
};

export function DailyReminder({
  moodHistory,
  todayCompleted,
  userPreferences,
}: {
  moodHistory: HistoryItem[];
  todayCompleted: boolean;
  userPreferences: UserPreferences;
}) {
  useEffect(() => {
    void scheduleDailyReminder({
      moodHistory,
      todayCompleted,
      userPreferences,
    });
  }, [moodHistory, todayCompleted, userPreferences]);

  return null;
}

export default DailyReminder;
