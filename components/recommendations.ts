import AsyncStorage from '@react-native-async-storage/async-storage';

export type MoodValue = 'Happy' | 'Calm' | 'Tired' | 'Anxious' | 'Angry' | 'Sad';
export type FavoriteReliefMethod = 'coffee' | 'walk' | 'gaming' | 'music' | 'meditation' | 'recovery' | 'other';
export type SupportStyle = 'quiet' | 'encouragement' | 'direct';
export type StressTime = 'morning' | 'afternoon' | 'evening' | 'before-sleep';
export type RecoveryType = 'neckShoulder' | 'wristHand' | 'backStretch';
export type TaskKind =
  | 'breathing'
  | 'bubbles'
  | 'coffee'
  | 'walk'
  | 'gaming'
  | 'music'
  | 'recovery'
  | 'meditation'
  | 'mood-check';
export type RecommendationTask = Exclude<TaskKind, 'mood-check'>;

export type UserPreferences = {
  favoriteReliefMethods: FavoriteReliefMethod[];
  reminderTime?: string;
  supportStyle: SupportStyle;
  stressTime: StressTime;
};

export type HistoryItem = {
  date: string;
  mood: MoodValue;
  recommendationSource?: 'personalized';
  recoveryType?: RecoveryType;
  reliefMethod: TaskKind;
  task?: TaskKind;
  wasTopPick?: boolean;
  completedAt: number;
};

export type PersonalizedRecommendation = {
  id: RecommendationTask;
  isTopPick: boolean;
  priority: number;
  reason: string;
  subtitle: string;
  title: string;
};

type StorageKeys = {
  xp: string;
  streak: string;
  lastCompletedDate: string;
  moodHistory: string;
};

const RECOMMENDATION_DETAILS: Record<RecommendationTask, { title: string; subtitle: string }> = {
  breathing: {
    title: 'Breathing Balloon',
    subtitle: '呼吸气球',
  },
  bubbles: {
    title: 'Pop Stress Bubbles',
    subtitle: '戳压力泡泡',
  },
  coffee: {
    title: 'Coffee with Dino',
    subtitle: '和小恐龙喝咖啡',
  },
  gaming: {
    title: 'Game Break',
    subtitle: '轻松打会儿游戏',
  },
  meditation: {
    title: 'Meditation with Dino',
    subtitle: '和小恐龙冥想',
  },
  music: {
    title: 'Listen with Dino',
    subtitle: '和小恐龙听会儿音乐',
  },
  recovery: {
    title: 'Recovery Training with Deer',
    subtitle: '和小鹿做放松训练',
  },
  walk: {
    title: 'Walk with Dino',
    subtitle: '和小恐龙散步',
  },
};

const MOOD_RECOMMENDATION_RULES: Record<
  MoodValue,
  { ids: RecommendationTask[]; reason: string }
> = {
  Angry: {
    ids: ['recovery', 'bubbles', 'walk'],
    reason: 'Your body may want to release some tension.\n你的身体可能想把紧绷感释放出来。',
  },
  Anxious: {
    ids: ['meditation', 'breathing', 'coffee'],
    reason: 'Your mind feels noisy. A quiet moment may help.\n你的脑袋有点吵，先给自己一个安静时刻。',
  },
  Calm: {
    ids: ['meditation', 'coffee', 'recovery'],
    reason: 'A calm moment is worth keeping.\n平静也是一种很棒的力量。',
  },
  Happy: {
    ids: ['coffee', 'walk', 'music'],
    reason: 'Keep this light feeling with Dino.\n把这份轻松和小恐龙一起留住。',
  },
  Sad: {
    ids: ['coffee', 'music', 'meditation'],
    reason: 'Dino will not rush you to be happy.\n小恐龙不催你开心，只是陪你待一会儿。',
  },
  Tired: {
    ids: ['coffee', 'meditation', 'recovery'],
    reason: 'You may need a tiny reset, not more pressure.\n你可能需要一点点恢复，而不是更多压力。',
  },
};

const preferenceToRecommendationId = (method: FavoriteReliefMethod): RecommendationTask | null => {
  if (method === 'other') {
    return null;
  }

  return method;
};

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const getYesterdayDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

export const getPersonalizedRecommendations = ({
  currentTimeOfDay,
  selectedMood,
  userPreferences,
}: {
  currentTimeOfDay: StressTime;
  selectedMood: MoodValue;
  userPreferences: UserPreferences;
}) => {
  const rule = MOOD_RECOMMENDATION_RULES[selectedMood];
  const preferredIds = userPreferences.favoriteReliefMethods
    .map(preferenceToRecommendationId)
    .filter((item): item is RecommendationTask => item !== null);
  const recommendationIds = new Set<RecommendationTask>([
    ...rule.ids,
    ...preferredIds,
    'breathing',
    'bubbles',
  ]);
  const isStressTime = currentTimeOfDay === userPreferences.stressTime;
  const stressTimeReason = isStressTime
    ? '\nThis is usually your stressful time. Dino is here with you.\n这通常是你压力更明显的时候，小恐龙在这里陪你。'
    : '';

  const recommendations = Array.from(recommendationIds)
    .map((id) => {
      const details = RECOMMENDATION_DETAILS[id];
      const moodIndex = rule.ids.indexOf(id);
      const preferenceIndex = preferredIds.indexOf(id);
      const moodScore = moodIndex >= 0 ? 100 - moodIndex * 10 : 28;
      const preferenceScore = preferenceIndex >= 0 ? 38 - preferenceIndex * 4 : 0;
      const stressTimeScore =
        isStressTime && (id === 'meditation' || id === 'breathing' || id === 'recovery') ? 8 : 0;

      return {
        id,
        isTopPick: false,
        priority: moodScore + preferenceScore + stressTimeScore,
        reason: `${rule.reason}${stressTimeReason}`,
        subtitle: details.subtitle,
        title: details.title,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  return recommendations.map((recommendation, index) => ({
    ...recommendation,
    isTopPick: index === 0,
  }));
};

export const recordReliefCompletion = async ({
  completedAt = Date.now(),
  mood,
  moodHistory,
  reliefMethod,
  storageKeys,
  todayCompleted,
  lastCompletedDate,
  recoveryType,
  streak,
  wasTopPick,
  xp,
}: {
  completedAt?: number;
  mood: MoodValue | null;
  moodHistory: HistoryItem[];
  reliefMethod: TaskKind;
  storageKeys: StorageKeys;
  todayCompleted: boolean;
  lastCompletedDate: string | null;
  recoveryType?: RecoveryType | null;
  streak: number;
  wasTopPick: boolean;
  xp: number;
}) => {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const isFirstCompletionToday = lastCompletedDate !== today && !todayCompleted;
  const xpGain = isFirstCompletionToday ? 10 : 5;
  const nextXp = xp + xpGain;
  const nextStreak = isFirstCompletionToday
    ? lastCompletedDate === yesterday
      ? streak + 1
      : 1
    : streak;
  const nextHistory =
    isFirstCompletionToday && mood
      ? [
          {
            date: today,
            mood,
            recommendationSource: 'personalized',
            recoveryType: recoveryType ?? undefined,
            reliefMethod,
            task: reliefMethod,
            wasTopPick,
            completedAt,
          } satisfies HistoryItem,
          ...moodHistory.filter((item) => item.date !== today),
        ].sort((a, b) => b.completedAt - a.completedAt)
      : moodHistory;

  await AsyncStorage.multiSet([
    [storageKeys.xp, String(nextXp)],
    [storageKeys.streak, String(nextStreak)],
    [storageKeys.lastCompletedDate, today],
    [storageKeys.moodHistory, JSON.stringify(nextHistory)],
  ]);

  return {
    isFirstCompletionToday,
    nextHistory,
    nextStreak,
    nextXp,
    xpGain,
  };
};

const Recommendations = {
  getPersonalizedRecommendations,
  recordReliefCompletion,
};

export default Recommendations;
