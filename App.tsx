import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AchievementsPanel from './components/achievements-panel';
import CharacterClosetPanel from './components/character-closet-panel';
import CoffeeScene from './components/coffee-scene';
import MeditationScene from './components/meditation-scene';
import DeerRecoveryScene from './components/deer-recovery-scene';
import DinoAvatar, { type DinoState } from './components/dino-avatar';
import DailyReminder, { DEFAULT_REMINDER_TIME_BY_STRESS_TIME } from './components/daily-reminder';
import FeaturePanel from './components/feature-panel';
import GentleReminderPanel from './components/gentle-reminder-panel';
import HomeOverview from './components/home-overview';
import LevelProgressPanel from './components/level-progress-panel';
import MoodSelector from './components/mood-selector';
import {
  CHARACTER_UNLOCK_STORAGE_KEY,
  CHARACTER_UNLOCKS,
  DEFAULT_CHARACTER_ITEM_ID,
  getActiveCharacterAccessories,
  getActiveDeerSkin,
  resolveCharacterUnlockState,
  type CharacterUnlockState,
} from './components/character-unlock';
import Recommendations, {
  type FavoriteReliefMethod,
  type HistoryItem,
  type MoodValue,
  type RecoveryType,
  type RecommendationTask,
  type StressTime,
  type SupportStyle,
  type TaskKind,
  type UserPreferences,
} from './components/recommendations';
import {
  ACHIEVEMENT_STORAGE_KEY,
  ACHIEVEMENTS,
  getUnlockedAchievementIds,
  type AchievementId,
} from './components/achievements';

type Step =
  | 'login'
  | 'onboarding'
  | 'preferences'
  | 'home'
  | 'mood'
  | 'state'
  | 'breathing'
  | 'bubbles'
  | 'coffee'
  | 'relief-placeholder'
  | 'recovery'
  | 'meditation'
  | 'complete'
  | 'history'
  | 'about';
type HomePanel = 'level' | 'closet' | 'reminder' | 'achievements';
type FlowAction =
  | { type: 'open_step'; step: Step }
  | { type: 'select_mood'; mood: MoodValue }
  | { type: 'open_home_panel'; panel: HomePanel }
  | { type: 'close_home_panel' }
  | { type: 'enter_recovery' }
  | { type: 'reset_to_home' };
type FlowState = {
  activeHomePanel: HomePanel | null;
  lastSelectedMood: MoodValue | null;
  screen: Step;
};
type DeerState = 'idle' | 'guiding' | 'happy';
type DinoLevelInfo = {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  chineseTitle: string;
  description: string;
  xpMin: number;
  xpMax: number | null;
  nextLevel: number | null;
};

type HeroContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

type MoodOption = {
  emoji: string;
  label: string;
  subLabel: string;
  value: MoodValue;
  tone: 'positive' | 'heavy';
};

type PreferenceOption<T extends string> = {
  emoji: string;
  label: string;
  subLabel: string;
  value: T;
};

type ReliefCard = {
  category: 'Favorite Relief' | 'Recovery Training' | 'Meditation';
  title: string;
  chineseTitle: string;
  description: string;
  chineseDescription: string;
  task: TaskKind;
  color: string;
  textColor: string;
};

type CoffeeSteamAnimation = {
  opacity: Animated.AnimatedInterpolation<number>;
  scale: Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
};

type RecoveryTraining = {
  description: string;
  key: RecoveryType;
  steps: Array<{ english: string; chinese: string }>;
  title: string;
  chineseTitle: string;
};

const FlowStateContext = createContext<FlowState | null>(null);
const FlowDispatchContext = createContext<Dispatch<FlowAction> | null>(null);

const flowReducer = (state: FlowState, action: FlowAction): FlowState => {
  if (action.type === 'open_step') {
    return { ...state, activeHomePanel: null, screen: action.step };
  }

  if (action.type === 'select_mood') {
    return { ...state, activeHomePanel: null, lastSelectedMood: action.mood, screen: 'state' };
  }

  if (action.type === 'open_home_panel') {
    return { ...state, activeHomePanel: action.panel };
  }

  if (action.type === 'close_home_panel') {
    return { ...state, activeHomePanel: null };
  }

  if (action.type === 'enter_recovery') {
    return { ...state, activeHomePanel: null, screen: 'recovery' };
  }

  return { ...state, activeHomePanel: null, screen: 'home' };
};

const moodOptions: MoodOption[] = [
  { emoji: '😊', label: 'Happy', subLabel: '开心', value: 'Happy', tone: 'positive' },
  { emoji: '😌', label: 'Calm', subLabel: '平静', value: 'Calm', tone: 'positive' },
  { emoji: '😴', label: 'Tired', subLabel: '疲惫', value: 'Tired', tone: 'heavy' },
  { emoji: '😰', label: 'Anxious', subLabel: '焦虑', value: 'Anxious', tone: 'heavy' },
  { emoji: '😡', label: 'Angry', subLabel: '生气', value: 'Angry', tone: 'heavy' },
  { emoji: '😢', label: 'Sad', subLabel: '难过', value: 'Sad', tone: 'heavy' },
];

const RESTORED_MOOD_OPTIONS = moodOptions.filter((mood) => mood.value !== 'Sad');

const STRESS_BUBBLE_WORDS = [
  'stress',
  'tired',
  'angry',
  'pressure',
  'overthinking',
  'worry',
  'noise',
  'fear',
  'mess',
  'sad',
];

const DINO_STATE_COPY: Record<DinoState, string> = {
  calm: '今天的小恐龙很安静。',
  happy: '小恐龙感受到你的好心情啦！',
  grumpy: '小恐龙接住了你的压力，现在它有点鼓鼓的。',
  healing: '我们一起慢慢松一口气。',
};

const BREATHING_PHASES = [
  { english: 'Inhale', chinese: '吸气', color: '#7AD8FF' },
  { english: 'Hold', chinese: '停住', color: '#FFD76A' },
  { english: 'Exhale', chinese: '呼气', color: '#95E37A' },
];

const MOOD_CONTENT: Record<
  MoodValue,
  { title: string; english: string; description: string }
> = {
  Happy: {
    title: '小恐龙感受到你的好心情啦！',
    english: 'Your dino feels your good energy.',
    description: '把这份轻松留在今天吧。',
  },
  Calm: {
    title: '今天的小恐龙很安静。',
    english: 'Your dino feels calm with you.',
    description: '平静也是一种很棒的力量。',
  },
  Tired: {
    title: '小恐龙看见你有点累了。',
    english: 'Your dino knows you are tired.',
    description: '今天不用逼自己太紧，我们慢慢来。',
  },
  Anxious: {
    title: '小恐龙听见你的脑袋有点吵。',
    english: 'Your dino feels the noise in your mind.',
    description: '先不用解决所有事，我们只做一次呼吸。',
  },
  Angry: {
    title: '小恐龙也有点鼓鼓的。',
    english: 'Your dino is puffed up with your stress.',
    description: '我们可以把压力泡泡一个个戳掉。',
  },
  Sad: {
    title: '小恐龙不催你开心。',
    english: 'Your dino will not rush you to be happy.',
    description: '它只是想陪你待一会儿。',
  },
};

const TASK_CONTENT: Record<TaskKind, { title: string; description: string; color: string; textColor: string }> = {
  breathing: {
    title: 'Breathing Balloon 呼吸气球',
    description: 'Slow down with 3 gentle breathing rounds.',
    color: '#DDF3FF',
    textColor: '#184B68',
  },
  bubbles: {
    title: 'Pop Stress Bubbles 戳压力泡泡',
    description: 'Tap away the little thoughts one bubble at a time.',
    color: '#FFE9F2',
    textColor: '#7E2D52',
  },
  'mood-check': {
    title: 'Mood Check 情绪记录',
    description: 'A soft check-in still counts as care.',
    color: '#F3FFE6',
    textColor: '#365040',
  },
  coffee: {
    title: 'Coffee with Dino 和小恐龙喝咖啡',
    description: 'Take a tiny coffee break with Dino.',
    color: '#FFF1D8',
    textColor: '#65411F',
  },
  walk: {
    title: 'Walk with Dino 和小恐龙散步',
    description: 'A soft walk can help the day feel wider.',
    color: '#E7F8D9',
    textColor: '#355C35',
  },
  gaming: {
    title: 'Game Break 轻松打会儿游戏',
    description: 'Play lightly, then check back in.',
    color: '#E5EEFF',
    textColor: '#2F4778',
  },
  music: {
    title: 'Listen with Dino 和小恐龙听会儿音乐',
    description: 'Let one gentle song hold the moment.',
    color: '#F4E8FF',
    textColor: '#5B4074',
  },
  recovery: {
    title: 'Recovery Training with Deer 和小鹿做放松训练',
    description: 'Swipe right to enter a gentle recovery space.',
    color: '#E6F4FF',
    textColor: '#244F67',
  },
  meditation: {
    title: 'Meditation with Dino 和小恐龙冥想',
    description: 'Choose 1, 3, or 5 minutes and breathe gently.',
    color: '#EEF0FF',
    textColor: '#3D4775',
  },
};

const ENCOURAGEMENT_MESSAGES = [
  {
    title: '今天你回来了，这就很重要。',
    english: 'You came back today. That matters.',
  },
  {
    title: '坏情绪不是敌人，它只是需要被照顾。',
    english: 'Bad feelings are not enemies. They just need care.',
  },
  {
    title: '不用一下子变好，慢慢恢复也很好。',
    english: 'You do not have to feel better all at once.',
  },
  {
    title: '你刚刚完成了一个温柔的小步骤。',
    english: 'You just finished one gentle step.',
  },
];

const LEVEL_CONFIG: DinoLevelInfo[] = [
  {
    level: 1,
    title: 'Tiny Dino',
    chineseTitle: '小小恐龙',
    description: '它刚刚开始陪你练习照顾情绪。',
    xpMin: 0,
    xpMax: 49,
    nextLevel: 2,
  },
  {
    level: 2,
    title: 'Gentle Dino',
    chineseTitle: '温柔恐龙',
    description: '它已经学会陪你慢慢呼吸。',
    xpMin: 50,
    xpMax: 119,
    nextLevel: 3,
  },
  {
    level: 3,
    title: 'Brave Dino',
    chineseTitle: '勇敢恐龙',
    description: '它开始更勇敢地接住坏情绪。',
    xpMin: 120,
    xpMax: 219,
    nextLevel: 4,
  },
  {
    level: 4,
    title: 'Calm Dino',
    chineseTitle: '平静恐龙',
    description: '它能陪你更稳定地度过压力时刻。',
    xpMin: 220,
    xpMax: 349,
    nextLevel: 5,
  },
  {
    level: 5,
    title: 'Guardian Dino',
    chineseTitle: '守护恐龙',
    description: '它已经成为你的情绪小伙伴。',
    xpMin: 350,
    xpMax: null,
    nextLevel: null,
  },
];

const ACCESSORY_UNLOCKS = [
  { level: 2, emoji: '🧣', label: 'Scarf' },
  { level: 3, emoji: '🌸', label: 'Flower' },
  { level: 4, emoji: '⭐', label: 'Star' },
  { level: 5, emoji: '👑', label: 'Crown' },
] as const;

const ONBOARDING_PAGES = [
  {
    title: 'Meet your tiny dino.',
    chineseTitle: '认识你的小恐龙。',
    description: 'Dino is here to gently hold your stress with you.',
    chineseDescription: '小恐龙会陪你一起接住压力。',
  },
  {
    title: 'Check in with your mood.',
    chineseTitle: '轻轻记录今天的心情。',
    description: 'Pick how you feel. No judgment, no pressure.',
    chineseDescription: '选择你的感受，不评价，也不催促。',
  },
  {
    title: 'Help Dino relax.',
    chineseTitle: '帮小恐龙松一口气。',
    description: 'Try breathing or popping stress bubbles to help Dino feel better.',
    chineseDescription: '用呼吸或戳泡泡，陪小恐龙慢慢恢复。',
  },
] as const;

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  favoriteReliefMethods: ['coffee', 'meditation', 'recovery'],
  reminderTime: '20:00',
  supportStyle: 'encouragement',
  stressTime: 'evening',
};

const FAVORITE_RELIEF_OPTIONS: PreferenceOption<FavoriteReliefMethod>[] = [
  { emoji: '☕', label: 'Coffee', subLabel: '喝咖啡', value: 'coffee' },
  { emoji: '🚶', label: 'Walk', subLabel: '散步', value: 'walk' },
  { emoji: '🎮', label: 'Gaming', subLabel: '打游戏', value: 'gaming' },
  { emoji: '🎵', label: 'Music', subLabel: '听音乐', value: 'music' },
  { emoji: '🧘', label: 'Meditation', subLabel: '冥想', value: 'meditation' },
  { emoji: '🦌', label: 'Recovery Training', subLabel: '康复训练', value: 'recovery' },
  { emoji: '✨', label: 'Other', subLabel: '其他', value: 'other' },
];

const SUPPORT_STYLE_OPTIONS: PreferenceOption<SupportStyle>[] = [
  { emoji: '🌿', label: 'Quiet company', subLabel: '安静陪伴', value: 'quiet' },
  { emoji: '💛', label: 'Gentle encouragement', subLabel: '温柔鼓励', value: 'encouragement' },
  { emoji: '🧭', label: 'Direct suggestion', subLabel: '直接推荐行动', value: 'direct' },
];

const STRESS_TIME_OPTIONS: PreferenceOption<StressTime>[] = [
  { emoji: '🌅', label: 'Morning', subLabel: '早上', value: 'morning' },
  { emoji: '☀️', label: 'Afternoon', subLabel: '下午', value: 'afternoon' },
  { emoji: '🌆', label: 'Evening', subLabel: '晚上', value: 'evening' },
  { emoji: '🌙', label: 'Before sleep', subLabel: '睡前', value: 'before-sleep' },
];

const REMINDER_TIME_OPTIONS: PreferenceOption<string>[] = [
  { emoji: '🌅', label: '09:00', subLabel: '早上提醒', value: '09:00' },
  { emoji: '☀️', label: '15:00', subLabel: '下午提醒', value: '15:00' },
  { emoji: '🌆', label: '20:00', subLabel: '晚上提醒', value: '20:00' },
  { emoji: '🌙', label: '22:00', subLabel: '睡前提醒', value: '22:00' },
];

const FAVORITE_RELIEF_CARDS: Partial<Record<FavoriteReliefMethod, ReliefCard>> = {
  coffee: {
    category: 'Favorite Relief',
    title: 'Coffee with Dino',
    chineseTitle: '和小恐龙喝杯咖啡',
    description: 'Take a tiny coffee break with Dino.',
    chineseDescription: '和小恐龙一起休息一下。',
    task: 'coffee',
    color: '#FFF1D8',
    textColor: '#65411F',
  },
  walk: {
    category: 'Favorite Relief',
    title: 'Walk with Dino',
    chineseTitle: '和小恐龙散步',
    description: 'A gentle walking space is coming soon.',
    chineseDescription: '散步空间即将上线。',
    task: 'walk',
    color: '#E7F8D9',
    textColor: '#355C35',
  },
  gaming: {
    category: 'Favorite Relief',
    title: 'Game Break',
    chineseTitle: '轻松打会儿游戏',
    description: 'A low-pressure game break space is coming soon.',
    chineseDescription: '轻松游戏休息空间即将上线。',
    task: 'gaming',
    color: '#E5EEFF',
    textColor: '#2F4778',
  },
  music: {
    category: 'Favorite Relief',
    title: 'Listen with Dino',
    chineseTitle: '和小恐龙听会儿音乐',
    description: 'A tiny listening corner is coming soon.',
    chineseDescription: '音乐陪伴角落即将上线。',
    task: 'music',
    color: '#F4E8FF',
    textColor: '#5B4074',
  },
};

const RECOVERY_CARD: ReliefCard = {
  category: 'Recovery Training',
  title: 'Recovery Training with Deer',
  chineseTitle: '和小鹿做放松训练',
  description: 'Let Deer guide a gentle body reset.',
  chineseDescription: '让小鹿带你做一次轻轻的身体放松。',
  task: 'recovery',
  color: '#E6F4FF',
  textColor: '#244F67',
};

const RECOVERY_TRAININGS: RecoveryTraining[] = [
  {
    key: 'neckShoulder',
    title: 'Neck & Shoulder Relax',
    chineseTitle: '肩颈放松',
    description: 'Release tiny tension around your neck and shoulders.\n轻轻放松肩颈附近的紧绷感。',
    steps: [
      { english: 'Sit upright gently.', chinese: '轻轻坐直。' },
      { english: 'Roll your shoulders slowly.', chinese: '慢慢转动肩膀。' },
      { english: 'Take one slow breath.', chinese: '慢慢呼吸一次。' },
    ],
  },
  {
    key: 'wristHand',
    title: 'Wrist & Hand Relax',
    chineseTitle: '手腕手部放松',
    description: 'A small reset for hands after studying or using your phone.\n给学习或使用手机后的双手一点放松。',
    steps: [
      { english: 'Open and close your hands slowly.', chinese: '慢慢张开、握紧双手。' },
      { english: 'Rotate your wrists gently.', chinese: '轻轻转动手腕。' },
      { english: 'Shake your hands softly.', chinese: '轻轻甩一甩双手。' },
    ],
  },
  {
    key: 'backStretch',
    title: 'Back Stretch',
    chineseTitle: '背部舒展',
    description: 'A gentle stretch for sitting too long.\n久坐之后，轻轻舒展一下背部。',
    steps: [
      { english: 'Sit tall and relax your shoulders.', chinese: '坐直，放松肩膀。' },
      { english: 'Reach your arms forward gently.', chinese: '双手轻轻向前伸展。' },
      { english: 'Take one slow breath and return.', chinese: '慢慢呼吸一次，然后回到原位。' },
    ],
  },
];

const MEDITATION_CARD: ReliefCard = {
  category: 'Meditation',
  title: 'Meditate with Dino',
  chineseTitle: '和小恐龙一起冥想',
  description: 'Choose 1, 3, or 5 minutes and breathe gently.',
  chineseDescription: '选择 1、3 或 5 分钟，慢慢呼吸。',
  task: 'meditation',
  color: '#EEF0FF',
  textColor: '#3D4775',
};

const STORAGE_KEYS = {
  hasLoggedIn: 'dino-calm-has-logged-in',
  hasSeenOnboarding: 'dino-calm-has-seen-onboarding',
  hasCompletedPreferenceSetup: 'dino-calm-has-completed-preference-setup',
  userPreferences: 'dino-calm-user-preferences',
  xp: 'dino-calm-xp',
  streak: 'dino-calm-streak',
  lastCompletedDate: 'dino-calm-last-completed-date',
  moodHistory: 'dino-calm-mood-history',
  lastSelectedMood: 'dino-calm-last-selected-mood',
  achievements: ACHIEVEMENT_STORAGE_KEY,
  characterUnlocks: CHARACTER_UNLOCK_STORAGE_KEY,
};

const HOME_PROMISES = [
  'No pressure',
  'Local progress',
  'Tiny calming steps',
] as const;

const CARD_SHADOW = '0 16px 30px rgba(87, 121, 69, 0.12)';
const SOFT_SHADOW = '0 10px 18px rgba(87, 121, 69, 0.1)';

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const getYesterdayDateString = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const formatHistoryDate = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getStreakLabel = (streak: number) => `${streak} day${streak === 1 ? '' : 's'}`;

const getMoodDisplayMap = () =>
  Object.fromEntries(
    moodOptions.map((item) => [item.value, `${item.emoji} ${item.label} ${item.subLabel}`]),
  ) as Record<MoodValue, string>;

const getCurrentLevelInfo = (xp: number) =>
  LEVEL_CONFIG.find((level) =>
    level.xpMax === null ? xp >= level.xpMin : xp >= level.xpMin && xp <= level.xpMax,
  ) ?? LEVEL_CONFIG[0];

const getDinoLevel = (xp: number) => getCurrentLevelInfo(xp).level;

const getTaskDisplayTitle = (task: TaskKind) => TASK_CONTENT[task]?.title ?? TASK_CONTENT['mood-check'].title;

const getSupportStyleCopy = (supportStyle: SupportStyle) => {
  if (supportStyle === 'quiet') {
    return 'Dino will stay nearby quietly. 小恐龙会安静陪着你。';
  }

  if (supportStyle === 'direct') {
    return 'Dino will suggest one small action first. 小恐龙会先给你一个小行动建议。';
  }

  return 'Dino will cheer softly, without pressure. 小恐龙会温柔鼓励你，不催促。';
};

const getCoffeeCompanionCopy = (supportStyle?: SupportStyle) => {
  if (supportStyle === 'quiet') {
    return 'Dino sits quietly with you.\n小恐龙安静地陪你坐一会儿。';
  }

  if (supportStyle === 'direct') {
    return 'Let’s take 30 seconds for a coffee break.\n我们用 30 秒休息一下。';
  }

  if (supportStyle === 'encouragement') {
    return 'Take one small sip. You are doing okay.\n慢慢喝一口，你已经做得不错了。';
  }

  return 'Dino is taking a tiny coffee break with you.\n小恐龙正在陪你喝一小杯咖啡。';
};

const getMeditationCompanionCopy = (supportStyle?: SupportStyle) => {
  if (supportStyle === 'quiet') {
    return 'Dino sits quietly with you.\n小恐龙安静地陪你坐一会儿。';
  }

  if (supportStyle === 'direct') {
    return 'Let’s sit for a short meditation now.\n我们现在开始一小段冥想。';
  }

  if (supportStyle === 'encouragement') {
    return 'One slow breath is already a gentle step.\n一次慢慢的呼吸，也是一小步照顾自己。';
  }

  return 'Dino is meditating with you.\n小恐龙正在陪你冥想。';
};

const getStressTimeCopy = (stressTime: StressTime) =>
  STRESS_TIME_OPTIONS.find((item) => item.value === stressTime)?.label ?? 'Evening';

const getRecoveryTrainingTitle = (recoveryType: RecoveryType) => {
  const training = RECOVERY_TRAININGS.find((item) => item.key === recoveryType);

  return training ? `${training.title} ${training.chineseTitle}` : 'Recovery Training';
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

function ScalePressable({
  onPress,
  disabled,
  style,
  animatedOpacity,
  extraScale,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style: object;
  animatedOpacity?: Animated.Value;
  extraScale?: Animated.Value;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 26,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animateScale(0.97)}
      onPressOut={() => animateScale(1)}
    >
      <Animated.View
        style={[
          style,
          {
            opacity: animatedOpacity ?? 1,
            transform: [{ scale }],
          },
          extraScale
            ? {
                transform: [{ scale: Animated.multiply(scale, extraScale) }],
              }
            : null,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  backgroundColor = '#69C651',
  textColor = '#12321D',
}: {
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
}) {
  return (
    <ScalePressable
      onPress={onPress}
      style={{
        backgroundColor,
        borderRadius: 999,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 20px rgba(72, 138, 62, 0.18)',
      }}
    >
      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 16,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </ScalePressable>
  );
}

function CompactStat({
  label,
  value,
  backgroundColor,
  textColor,
}: {
  label: string;
  value: string;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        borderRadius: 22,
        minHeight: 84,
        justifyContent: 'center',
        gap: 4,
        padding: 14,
        boxShadow: '0 10px 18px rgba(87, 121, 69, 0.12)',
      }}
    >
      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 12,
          fontWeight: '900',
          letterSpacing: 0.3,
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: textColor,
          fontSize: 22,
          fontWeight: '900',
          fontVariant: ['tabular-nums'],
          textAlign: 'center',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function HomeScreen({
  activeCharacterAccessories,
  buttonScales,
  currentLevel,
  dinoBounce,
  dinoState,
  isCompact,
  onOpenMood,
  onOpenPanel,
  onOpenRecovery,
  streakLabel,
  xp,
}: {
  activeCharacterAccessories: string[];
  buttonScales: Record<HomePanel, Animated.Value>;
  currentLevel: DinoLevelInfo;
  dinoBounce: Animated.Value;
  dinoState: DinoState;
  isCompact: boolean;
  onOpenMood: () => void;
  onOpenPanel: (panel: HomePanel) => void;
  onOpenRecovery: () => void;
  streakLabel: string;
  xp: number;
}) {
  return (
    <HomeOverview
      activeCharacterAccessories={activeCharacterAccessories}
      buttonScales={buttonScales}
      currentLevel={currentLevel}
      dinoBounce={dinoBounce}
      dinoState={dinoState}
      isCompact={isCompact}
      onOpenMood={onOpenMood}
      onOpenPanel={onOpenPanel}
      onOpenRecovery={onOpenRecovery}
      streakLabel={streakLabel}
      xp={xp}
    />
  );
}

function GentleReminderPage({
  onSelectReminderTime,
  todayCompleted,
  userPreferences,
}: {
  onSelectReminderTime: (time: string) => void;
  todayCompleted: boolean;
  userPreferences: UserPreferences;
}) {
  return (
    <GentleReminderPanel
      onSelectReminderTime={onSelectReminderTime}
      reminderTimeOptions={REMINDER_TIME_OPTIONS}
      todayCompleted={todayCompleted}
      userPreferences={userPreferences}
    />
  );
}

function HomeFeaturePanel({
  activePanel,
  animation,
  characterUnlockRecords,
  characterUnlocks,
  currentLevel,
  currentLevelGoal,
  levelProgressWidth,
  onClose,
  onSelectCharacterItem,
  onSelectReminderTime,
  streak,
  todayCompleted,
  unlockedAchievementIds,
  userPreferences,
  width,
  xp,
  xpToNextLevel,
}: {
  activePanel: HomePanel | null;
  animation: Animated.Value;
  characterUnlockRecords: Array<{
    conditionLabel: string;
    emoji: string;
    id: string;
    isUnlocked: boolean;
    title: string;
    unlockCopy: string;
  }>;
  characterUnlocks: CharacterUnlockState;
  currentLevel: DinoLevelInfo;
  currentLevelGoal: number;
  levelProgressWidth: Animated.AnimatedInterpolation<string | number>;
  onClose: () => void;
  onSelectCharacterItem: (itemId: string) => void;
  onSelectReminderTime: (time: string) => void;
  streak: number;
  todayCompleted: boolean;
  unlockedAchievementIds: AchievementId[];
  userPreferences: UserPreferences;
  width: number;
  xp: number;
  xpToNextLevel: number;
}) {
  if (!activePanel) {
    return null;
  }

  return (
    <FeaturePanel
      activePanel={activePanel}
      animation={animation}
      onClose={onClose}
      width={width}
    >
      {activePanel === 'level' ? (
        <LevelProgressPanel
          currentLevel={currentLevel}
          currentLevelGoal={currentLevelGoal}
          levels={LEVEL_CONFIG}
          levelProgressWidth={levelProgressWidth}
          xp={xp}
          xpToNextLevel={xpToNextLevel}
        />
      ) : null}
      {activePanel === 'closet' ? (
        <CharacterClosetPanel
          characterUnlocks={characterUnlocks}
          onSelectCharacterItem={onSelectCharacterItem}
          streak={streak}
          xp={xp}
        />
      ) : null}
      {activePanel === 'reminder' ? (
        <GentleReminderPage
          onSelectReminderTime={onSelectReminderTime}
          todayCompleted={todayCompleted}
          userPreferences={userPreferences}
        />
      ) : null}
      {activePanel === 'achievements' ? (
        <AchievementsPanel
          characterUnlockRecords={characterUnlockRecords}
          unlockedAchievementIds={unlockedAchievementIds}
        />
      ) : null}
    </FeaturePanel>
  );
}

function CoffeeDinoScene({
  accessories,
  cupScale,
  dinoMood,
  dinoScale,
  dinoTranslateY,
  glowOpacity,
  isCompact,
  steamAnimations,
}: {
  accessories: string[];
  cupScale: Animated.AnimatedInterpolation<number>;
  dinoMood: DinoState;
  dinoScale: Animated.AnimatedInterpolation<number>;
  dinoTranslateY: Animated.AnimatedInterpolation<number>;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  isCompact: boolean;
  steamAnimations: CoffeeSteamAnimation[];
}) {
  const dinoSize = isCompact ? 126 : 146;

  return (
    <View
      style={{
        width: '100%',
        minHeight: isCompact ? 294 : 326,
        borderRadius: 34,
        backgroundColor: '#FFF6E3',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#F3DFB6',
        boxShadow: '0 18px 32px rgba(129, 91, 48, 0.14)',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 20,
          left: 18,
          width: 132,
          height: 132,
          borderRadius: 999,
          backgroundColor: '#E5F6D5',
          opacity: glowOpacity,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 46,
          right: 20,
          width: 112,
          height: 112,
          borderRadius: 999,
          backgroundColor: '#FFF0B9',
          opacity: glowOpacity,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 94,
          alignSelf: 'center',
          width: '82%',
          height: 118,
          borderRadius: 999,
          backgroundColor: '#F8EACB',
          opacity: 0.52,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 42,
          width: '96%',
          height: 46,
          borderRadius: 999,
          backgroundColor: '#C79963',
          transform: [{ scaleX: 1.04 }],
          boxShadow: '0 14px 22px rgba(111, 71, 32, 0.2)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 72,
          width: '98%',
          height: 28,
          borderRadius: 999,
          backgroundColor: '#E7BE83',
          transform: [{ scaleX: 1.02 }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 94,
          left: '12%',
          width: '76%',
          height: 18,
          borderRadius: 999,
          backgroundColor: '#FFE7BE',
          opacity: 0.9,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: isCompact ? 30 : 40,
          bottom: 72,
          width: dinoSize * 0.8,
          height: 28,
          borderRadius: 999,
          backgroundColor: '#87633D',
          opacity: 0.18,
          transform: [{ scaleX: 1.22 }],
        }}
      />

      <Animated.View
        style={{
          position: 'absolute',
          left: isCompact ? 18 : 28,
          bottom: 80,
          alignItems: 'center',
          transform: [{ translateY: dinoTranslateY }, { scale: dinoScale }],
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 20,
            width: dinoSize * 0.78,
            height: dinoSize * 0.48,
            borderRadius: 999,
            backgroundColor: '#F1FFD9',
            opacity: 0.42,
            transform: [{ rotate: '-12deg' }],
            zIndex: 2,
          }}
        />
        <DinoAvatar accessories={accessories} state={dinoMood} size={dinoSize} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          right: isCompact ? 38 : 56,
          bottom: 88,
          alignItems: 'center',
          transform: [{ scale: cupScale }],
        }}
      >
        <View style={{ width: 88, height: 78, alignItems: 'center' }}>
          {steamAnimations.map((steam, index) => (
            <Animated.Text
              key={index}
              selectable={false}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 22 + index * 15,
                fontSize: index === 1 ? 27 : 23,
                color: '#8A6A4B',
                opacity: steam.opacity,
                transform: [
                  { translateY: steam.translateY },
                  { scale: steam.scale },
                  { rotate: index === 1 ? '10deg' : '-8deg' },
                ],
              }}
            >
              ~
            </Animated.Text>
          ))}
        </View>
        <View
          style={{
            width: 82,
            height: 60,
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            borderWidth: 3,
            borderColor: '#B88353',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 16px rgba(112, 72, 36, 0.18)',
          }}
        >
          <View
            style={{
              position: 'absolute',
              right: -17,
              width: 28,
              height: 32,
              borderRadius: 999,
              borderWidth: 4,
              borderColor: '#B88353',
              backgroundColor: 'transparent',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 13,
              top: 9,
              width: 24,
              height: 9,
              borderRadius: 999,
              backgroundColor: '#FFFFFF',
              opacity: 0.82,
              transform: [{ rotate: '-12deg' }],
            }}
          />
          <View
            style={{
              width: 52,
              height: 26,
              borderRadius: 999,
              backgroundColor: '#8B5A34',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              width: 62,
              height: 5,
              borderRadius: 999,
              backgroundColor: '#EBD8C8',
            }}
          />
        </View>
      </Animated.View>

      <Text
        selectable
        style={{
          position: 'absolute',
          top: 22,
          alignSelf: 'center',
          fontSize: 13,
          fontWeight: '900',
          color: '#8A6A4B',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Tiny coffee break
      </Text>
    </View>
  );
}

function DeerAvatar({
  slide,
  state,
  sway,
  size = 150,
}: {
  slide?: Animated.AnimatedInterpolation<number>;
  state: DeerState;
  sway?: Animated.AnimatedInterpolation<number>;
  size?: number;
}) {
  const bodyWidth = size * 0.58;
  const bodyHeight = size * 0.46;
  const headSize = size * 0.58;
  const isHappy = state === 'happy';

  return (
    <Animated.View
      style={{
        width: size,
        height: size * 1.12,
        alignItems: 'center',
        justifyContent: 'flex-end',
        transform: [
          ...(slide ? [{ translateX: slide }] : []),
          ...(sway ? [{ translateY: sway }] : []),
        ],
      }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.04,
          width: size * 0.58,
          height: size * 0.11,
          borderRadius: 999,
          backgroundColor: '#9DB5B5',
          opacity: 0.22,
          transform: [{ scaleX: 1.18 }],
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          left: size * 0.28,
          width: size * 0.045,
          height: size * 0.2,
          borderRadius: 999,
          backgroundColor: '#8A5A35',
          transform: [{ rotate: '-24deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          right: size * 0.28,
          width: size * 0.045,
          height: size * 0.2,
          borderRadius: 999,
          backgroundColor: '#8A5A35',
          transform: [{ rotate: '24deg' }],
        }}
      />
      {[0, 1].map((side) => (
        <View
          key={side}
          style={{
            position: 'absolute',
            top: size * 0.18,
            left: side === 0 ? size * 0.22 : undefined,
            right: side === 1 ? size * 0.22 : undefined,
            width: size * 0.08,
            height: size * 0.035,
            borderRadius: 999,
            backgroundColor: '#8A5A35',
            transform: [{ rotate: side === 0 ? '-18deg' : '18deg' }],
          }}
        />
      ))}

      <View
        style={{
          width: headSize,
          height: headSize * 0.86,
          borderRadius: headSize * 0.4,
          backgroundColor: '#D8A56F',
          borderWidth: 3,
          borderColor: '#9A6C42',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 20px rgba(98, 72, 48, 0.14)',
          zIndex: 2,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: headSize * 0.15,
            left: headSize * 0.13,
            width: headSize * 0.16,
            height: headSize * 0.16,
            borderRadius: 999,
            backgroundColor: '#C98F5E',
            borderWidth: 2,
            borderColor: '#9A6C42',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: headSize * 0.15,
            right: headSize * 0.13,
            width: headSize * 0.16,
            height: headSize * 0.16,
            borderRadius: 999,
            backgroundColor: '#C98F5E',
            borderWidth: 2,
            borderColor: '#9A6C42',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: headSize * 0.04,
            width: headSize * 0.52,
            height: headSize * 0.36,
            borderRadius: 999,
            backgroundColor: '#FFF0D2',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            gap: headSize * 0.22,
            marginTop: -headSize * 0.02,
          }}
        >
          <Text selectable={false} style={{ fontSize: size * 0.075, color: '#2C2D28' }}>
            {isHappy ? '◠' : '•'}
          </Text>
          <Text selectable={false} style={{ fontSize: size * 0.075, color: '#2C2D28' }}>
            {isHappy ? '◠' : '•'}
          </Text>
        </View>
        <Text
          selectable={false}
          style={{
            marginTop: -size * 0.02,
            fontSize: size * 0.08,
            color: '#4B3A2A',
          }}
        >
          {isHappy ? 'ᴗ' : '︶'}
        </Text>
      </View>

      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          marginTop: -size * 0.08,
          borderRadius: bodyWidth * 0.42,
          backgroundColor: '#D8A56F',
          borderWidth: 3,
          borderColor: '#9A6C42',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: size * 0.06,
        }}
      >
        <View
          style={{
            width: bodyWidth * 0.5,
            height: bodyHeight * 0.56,
            borderRadius: 999,
            backgroundColor: '#FFF0D2',
          }}
        />
      </View>
    </Animated.View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <CalmApp />
    </SafeAreaProvider>
  );
}

function CalmApp() {
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState<Step>('onboarding');
  const [onboardingPage, setOnboardingPage] = useState(0);
  const [preferencePage, setPreferencePage] = useState(0);
  const [favoriteReliefMethods, setFavoriteReliefMethods] = useState<FavoriteReliefMethod[]>([]);
  const [supportStyle, setSupportStyle] = useState<SupportStyle | null>(null);
  const [stressTime, setStressTime] = useState<StressTime | null>(null);
  const [reminderTime, setReminderTime] = useState(DEFAULT_USER_PREFERENCES.reminderTime ?? '20:00');
  const [preferenceError, setPreferenceError] = useState('');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [dinoState, setDinoState] = useState<DinoState>('calm');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [poppedBubbles, setPoppedBubbles] = useState<string[]>([]);
  const [animatingBubbles, setAnimatingBubbles] = useState<string[]>([]);
  const [breathingStarted, setBreathingStarted] = useState(false);
  const [breathingRound, setBreathingRound] = useState(1);
  const [breathingPhaseIndex, setBreathingPhaseIndex] = useState(0);
  const [reliefProgress, setReliefProgress] = useState(0);
  const [completeEncouragement, setCompleteEncouragement] = useState(ENCOURAGEMENT_MESSAGES[0]);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [lastCompletedDate, setLastCompletedDate] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<HistoryItem[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<AchievementId[]>([]);
  const [newAchievementIds, setNewAchievementIds] = useState<AchievementId[]>([]);
  const [characterUnlocks, setCharacterUnlocks] = useState<CharacterUnlockState>({
    unlockedItems: [DEFAULT_CHARACTER_ITEM_ID],
    activeItem: DEFAULT_CHARACTER_ITEM_ID,
  });
  const [completedTask, setCompletedTask] = useState<TaskKind | null>(null);
  const [completedWasTopPick, setCompletedWasTopPick] = useState(false);
  const [placeholderTask, setPlaceholderTask] = useState<TaskKind | null>(null);
  const [coffeeStarted, setCoffeeStarted] = useState(false);
  const [coffeeSecondsLeft, setCoffeeSecondsLeft] = useState(30);
  const [selectedMeditationMinutes, setSelectedMeditationMinutes] = useState<1 | 3 | 5 | null>(null);
  const [meditationSecondsLeft, setMeditationSecondsLeft] = useState(0);
  const [meditationCompleted, setMeditationCompleted] = useState(false);
  const [meditationPaused, setMeditationPaused] = useState(false);
  const [meditationStarted, setMeditationStarted] = useState(false);
  const [recoveryCompleted, setRecoveryCompleted] = useState(false);
  const [recoveryPaused, setRecoveryPaused] = useState(false);
  const [recoverySecondsLeft, setRecoverySecondsLeft] = useState(10);
  const [recoveryStarted, setRecoveryStarted] = useState(false);
  const [recoveryStepIndex, setRecoveryStepIndex] = useState(0);
  const [selectedRecoveryType, setSelectedRecoveryType] = useState<RecoveryType | null>(null);
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [flowState, flowDispatch] = useReducer(flowReducer, {
    activeHomePanel: null,
    lastSelectedMood: null,
    screen: 'onboarding',
  });
  const [completionReward, setCompletionReward] = useState({
    xp: 10,
    alreadyCompleted: false,
    leveledUp: false,
  });
  const dinoBounce = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(
    Object.fromEntries(STRESS_BUBBLE_WORDS.map((bubble) => [bubble, new Animated.Value(1)])),
  ).current;
  const bubbleScale = useRef(
    Object.fromEntries(STRESS_BUBBLE_WORDS.map((bubble) => [bubble, new Animated.Value(1)])),
  ).current;
  const levelProgressAnim = useRef(new Animated.Value(0)).current;
  const screenTransition = useRef(new Animated.Value(1)).current;
  const homePanelTransition = useRef(new Animated.Value(0)).current;
  const homeButtonScales = useRef<Record<HomePanel, Animated.Value>>({
    level: new Animated.Value(1),
    closet: new Animated.Value(1),
    reminder: new Animated.Value(1),
    achievements: new Animated.Value(1),
  }).current;

  useEffect(() => {
    let isMounted = true;

    const loadProgress = async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          STORAGE_KEYS.hasLoggedIn,
          STORAGE_KEYS.hasSeenOnboarding,
          STORAGE_KEYS.hasCompletedPreferenceSetup,
          STORAGE_KEYS.userPreferences,
          STORAGE_KEYS.xp,
          STORAGE_KEYS.streak,
          STORAGE_KEYS.lastCompletedDate,
          STORAGE_KEYS.moodHistory,
          STORAGE_KEYS.achievements,
          STORAGE_KEYS.characterUnlocks,
        ]);
        const savedHasLoggedIn = entries[0]?.[1] === 'true';
        const savedHasSeenOnboarding = entries[1]?.[1] === 'true';
        const savedHasCompletedPreferenceSetup = entries[2]?.[1] === 'true';
        const savedUserPreferences = entries[3]?.[1];
        const savedXp = Number(entries[4]?.[1] ?? '0');
        const savedStreak = Number(entries[5]?.[1] ?? '0');
        const savedLastCompletedDate = entries[6]?.[1] ?? null;
        const savedMoodHistory = entries[7]?.[1];
        const savedAchievements = entries[8]?.[1];
        const savedCharacterUnlocks = entries[9]?.[1];
        const isStillToday =
          savedLastCompletedDate !== null && savedLastCompletedDate === getTodayDateString();
        const parsedPreferences = savedUserPreferences
          ? ({ ...DEFAULT_USER_PREFERENCES, ...JSON.parse(savedUserPreferences) } as UserPreferences)
          : DEFAULT_USER_PREFERENCES;

        if (!isMounted) {
          return;
        }

        setCurrentStep(
          !savedHasLoggedIn
            ? 'login'
            : !savedHasSeenOnboarding
              ? 'onboarding'
              : !savedHasCompletedPreferenceSetup
                ? 'preferences'
                : 'home',
        );
        setUserPreferences(parsedPreferences);
        setFavoriteReliefMethods(parsedPreferences.favoriteReliefMethods);
        setSupportStyle(parsedPreferences.supportStyle);
        setStressTime(parsedPreferences.stressTime);
        setReminderTime(
          parsedPreferences.reminderTime ??
            DEFAULT_REMINDER_TIME_BY_STRESS_TIME[parsedPreferences.stressTime],
        );
        setXp(Number.isFinite(savedXp) ? savedXp : 0);
        setStreak(Number.isFinite(savedStreak) ? savedStreak : 0);
        setLastCompletedDate(savedLastCompletedDate);
        setTodayCompleted(isStillToday);
        setMoodHistory(
          savedMoodHistory
            ? (JSON.parse(savedMoodHistory) as HistoryItem[]).map((item) => ({
                ...item,
                reliefMethod: item.reliefMethod ?? item.task ?? 'mood-check',
              }))
            : [],
        );
        setUnlockedAchievementIds(
          savedAchievements ? (JSON.parse(savedAchievements) as AchievementId[]) : [],
        );
        setCharacterUnlocks(
          resolveCharacterUnlockState({
            savedState: savedCharacterUnlocks
              ? (JSON.parse(savedCharacterUnlocks) as CharacterUnlockState)
              : null,
            streak: Number.isFinite(savedStreak) ? savedStreak : 0,
            xp: Number.isFinite(savedXp) ? savedXp : 0,
          }),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setCurrentStep('login');
        setUserPreferences(DEFAULT_USER_PREFERENCES);
        setXp(0);
        setStreak(0);
        setLastCompletedDate(null);
        setTodayCompleted(false);
        setMoodHistory([]);
        setUnlockedAchievementIds([]);
        setCharacterUnlocks({
          unlockedItems: [DEFAULT_CHARACTER_ITEM_ID],
          activeItem: DEFAULT_CHARACTER_ITEM_ID,
        });
      }
    };

    void loadProgress();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    screenTransition.setValue(0);
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentStep, screenTransition]);

  useEffect(() => {
    if (currentStep !== 'home' && flowState.activeHomePanel) {
      flowDispatch({ type: 'close_home_panel' });
      homePanelTransition.setValue(0);
    }
  }, [currentStep, flowState.activeHomePanel, homePanelTransition]);

  useEffect(() => {
    if (currentStep !== 'breathing' || !breathingStarted) {
      return;
    }

    const timer = setInterval(() => {
      setDinoState('healing');

      setBreathingPhaseIndex((currentPhase) => {
        const isLastPhase = currentPhase === BREATHING_PHASES.length - 1;

        if (!isLastPhase) {
          return currentPhase + 1;
        }

        if (breathingRound >= 3) {
          setReliefProgress(100);
          void completeTask();
          return currentPhase;
        }

        const nextRound = breathingRound + 1;
        setBreathingRound((round) => round + 1);
        setReliefProgress(nextRound === 2 ? 33 : 66);
        return 0;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [breathingRound, breathingStarted, currentStep]);

  useEffect(() => {
    if (currentStep !== 'coffee' || !coffeeStarted || coffeeSecondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCoffeeSecondsLeft((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [coffeeSecondsLeft, coffeeStarted, currentStep]);

  useEffect(() => {
    if (
      currentStep !== 'meditation' ||
      selectedMeditationMinutes === null ||
      !meditationStarted ||
      meditationPaused ||
      meditationSecondsLeft <= 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setMeditationSecondsLeft((seconds) => {
        const nextSeconds = Math.max(seconds - 1, 0);

        if (nextSeconds === 0) {
          setMeditationCompleted(true);
          setMeditationPaused(false);
          setMeditationStarted(false);
        }

        return nextSeconds;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    currentStep,
    meditationPaused,
    meditationSecondsLeft,
    meditationStarted,
    selectedMeditationMinutes,
  ]);

  useEffect(() => {
    if (
      currentStep !== 'recovery' ||
      selectedRecoveryType === null ||
      !recoveryStarted ||
      recoveryPaused ||
      recoverySecondsLeft <= 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setRecoverySecondsLeft((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    currentStep,
    recoveryPaused,
    recoverySecondsLeft,
    recoveryStarted,
    selectedRecoveryType,
  ]);

  useEffect(() => {
    if (currentStep !== 'complete') {
      dinoBounce.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(dinoBounce, {
        toValue: 1.08,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(dinoBounce, {
        toValue: 1,
        speed: 18,
        bounciness: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, dinoBounce]);

  useEffect(() => {
    if (!selectedMood) {
      return;
    }

    const selectedOption = moodOptions.find((item) => item.value === selectedMood);

    if (selectedOption?.tone === 'positive') {
      setDinoState('happy');
      return;
    }

    if (reliefProgress <= 0) {
      setDinoState('grumpy');
      return;
    }

    if (reliefProgress >= 100) {
      setDinoState('happy');
      return;
    }

    setDinoState('healing');
  }, [reliefProgress, selectedMood]);

  const resetBubbleAnimations = () => {
    STRESS_BUBBLE_WORDS.forEach((bubble) => {
      bubbleOpacity[bubble].setValue(1);
      bubbleScale[bubble].setValue(1);
    });
    setAnimatingBubbles([]);
  };

  const resetBreathing = () => {
    setBreathingStarted(false);
    setBreathingRound(1);
    setBreathingPhaseIndex(0);
  };

  const resetActivityState = () => {
    setCoffeeStarted(false);
    setCoffeeSecondsLeft(30);
    setSelectedMeditationMinutes(null);
    setMeditationCompleted(false);
    setMeditationPaused(false);
    setMeditationSecondsLeft(0);
    setMeditationStarted(false);
    setRecoveryCompleted(false);
    setRecoveryPaused(false);
    setRecoverySecondsLeft(10);
    setRecoveryStarted(false);
    setRecoveryStepIndex(0);
    setSelectedRecoveryType(null);
    setTrainingStarted(false);
    setPlaceholderTask(null);
  };

  const restartDemo = () => {
    flowDispatch({ type: 'reset_to_home' });
    homePanelTransition.setValue(0);
    Object.values(homeButtonScales).forEach((scale) => scale.setValue(1));
    setCurrentStep('home');
    setSelectedMood(null);
    setCompletedWasTopPick(false);
    setNewAchievementIds([]);
    setDinoState('calm');
    setPoppedBubbles([]);
    setReliefProgress(0);
    resetBubbleAnimations();
    resetBreathing();
    resetActivityState();
  };

  const goHome = () => {
    flowDispatch({ type: 'reset_to_home' });
    homePanelTransition.setValue(0);
    Object.values(homeButtonScales).forEach((scale) => scale.setValue(1));
    setCurrentStep('home');
    setSelectedMood(null);
    setCompletedWasTopPick(false);
    setNewAchievementIds([]);
    setDinoState('calm');
    setPoppedBubbles([]);
    setReliefProgress(0);
    resetBubbleAnimations();
    resetBreathing();
    resetActivityState();
  };

  const openHomePanel = (panel: HomePanel) => {
    flowDispatch({ type: 'open_home_panel', panel });
    homePanelTransition.setValue(0);
    Object.entries(homeButtonScales).forEach(([key, scale]) => {
      if (key !== panel) {
        scale.setValue(1);
      }
    });
    Animated.parallel([
      Animated.sequence([
        Animated.spring(homeButtonScales[panel], {
          toValue: 1.18,
          useNativeDriver: true,
          speed: 22,
          bounciness: 6,
        }),
        Animated.spring(homeButtonScales[panel], {
          toValue: 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 4,
        }),
      ]),
      Animated.spring(homePanelTransition, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 5,
      }),
    ]).start();
  };

  const closeHomePanel = () => {
    Animated.parallel([
      Animated.timing(homePanelTransition, {
        toValue: 0,
        duration: 220,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      ...Object.values(homeButtonScales).map((scale) =>
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }),
      ),
    ]).start(({ finished }) => {
      if (finished) {
        flowDispatch({ type: 'close_home_panel' });
      }
    });
  };

  const handleMockLogin = async () => {
    setCurrentStep('onboarding');

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.hasLoggedIn, 'true');
      const entries = await AsyncStorage.multiGet([
        STORAGE_KEYS.hasSeenOnboarding,
        STORAGE_KEYS.hasCompletedPreferenceSetup,
      ]);
      const hasSeenOnboarding = entries[0]?.[1] === 'true';
      const hasCompletedPreferenceSetup = entries[1]?.[1] === 'true';

      setCurrentStep(
        !hasSeenOnboarding ? 'onboarding' : !hasCompletedPreferenceSetup ? 'preferences' : 'home',
      );
    } catch {
      // Keep demo flow moving even if local storage is unavailable.
    }
  };

  const toggleFavoriteReliefMethod = (method: FavoriteReliefMethod) => {
    setPreferenceError('');
    setFavoriteReliefMethods((current) =>
      current.includes(method) ? current.filter((item) => item !== method) : [...current, method],
    );
  };

  const goToNextPreferenceStep = () => {
    if (preferencePage === 0 && favoriteReliefMethods.length === 0) {
      setPreferenceError('Pick at least one tiny relief method.\n至少选择一种你喜欢的解压方式。');
      return;
    }

    if (preferencePage === 1 && supportStyle === null) {
      setPreferenceError('Choose how Dino can support you.\n选择小恐龙陪你的方式。');
      return;
    }

    if (preferencePage === 2 && stressTime === null) {
      setPreferenceError('Choose when stress usually shows up.\n选择你通常压力更明显的时间。');
      return;
    }

    setPreferenceError('');

    if (preferencePage < 2) {
      setPreferencePage((page) => page + 1);
      return;
    }

    void completePreferenceSetup();
  };

  const completePreferenceSetup = async () => {
    const nextPreferences: UserPreferences = {
      favoriteReliefMethods:
        favoriteReliefMethods.length > 0
          ? favoriteReliefMethods
          : DEFAULT_USER_PREFERENCES.favoriteReliefMethods,
      supportStyle: supportStyle ?? DEFAULT_USER_PREFERENCES.supportStyle,
      stressTime: stressTime ?? DEFAULT_USER_PREFERENCES.stressTime,
      reminderTime:
        reminderTime ??
        DEFAULT_REMINDER_TIME_BY_STRESS_TIME[stressTime ?? DEFAULT_USER_PREFERENCES.stressTime],
    };

    setUserPreferences(nextPreferences);
    setCurrentStep('home');

    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.hasCompletedPreferenceSetup, 'true'],
        [STORAGE_KEYS.userPreferences, JSON.stringify(nextPreferences)],
      ]);
    } catch {
      // Preference setup should not block the demo if storage fails.
    }
  };

  const updateReminderTime = async (nextReminderTime: string) => {
    const nextPreferences: UserPreferences = {
      ...userPreferences,
      reminderTime: nextReminderTime,
    };

    setReminderTime(nextReminderTime);
    setUserPreferences(nextPreferences);

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.userPreferences, JSON.stringify(nextPreferences));
    } catch {
      // Reminder settings should stay usable even if persistence fails.
    }
  };

  const updateActiveCharacterItem = async (itemId: string) => {
    if (!characterUnlocks.unlockedItems.includes(itemId)) {
      return;
    }

    const nextCharacterUnlocks = {
      ...characterUnlocks,
      activeItem: itemId,
    };

    setCharacterUnlocks(nextCharacterUnlocks);

    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.characterUnlocks,
        JSON.stringify(nextCharacterUnlocks),
      );
    } catch {
      // Character selection should stay responsive even if persistence fails.
    }
  };

  const resetProgress = async () => {
    setXp(0);
    setStreak(0);
    setTodayCompleted(false);
    setLastCompletedDate(null);
    setMoodHistory([]);
    setUnlockedAchievementIds([]);
    setCharacterUnlocks({
      unlockedItems: [DEFAULT_CHARACTER_ITEM_ID],
      activeItem: DEFAULT_CHARACTER_ITEM_ID,
    });

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.xp,
        STORAGE_KEYS.streak,
        STORAGE_KEYS.lastCompletedDate,
        STORAGE_KEYS.moodHistory,
        STORAGE_KEYS.lastSelectedMood,
        STORAGE_KEYS.achievements,
        STORAGE_KEYS.characterUnlocks,
      ]);
    } catch {
      // Ignore reset failures during demo use.
    }
  };

  const handleSelectMood = (mood: MoodOption) => {
    flowDispatch({ type: 'select_mood', mood: mood.value });
    setSelectedMood(mood.value);
    void AsyncStorage.setItem(STORAGE_KEYS.lastSelectedMood, mood.value);
    setCurrentStep('state');
    setCompletedWasTopPick(false);
    setPoppedBubbles([]);
    resetBubbleAnimations();
    resetBreathing();
    setReliefProgress(mood.tone === 'positive' ? 100 : 0);

    if (mood.tone === 'positive') {
      setDinoState('happy');
      return;
    }

    setDinoState('grumpy');
  };

  const openMoodSelection = () => {
    flowDispatch({ type: 'open_step', step: 'mood' });
    setCurrentStep('mood');
    setDinoState('calm');
    setCompletedWasTopPick(false);
    setReliefProgress(0);
  };

  const openRecoveryTraining = () => {
    flowDispatch({ type: 'enter_recovery' });
    setCurrentStep('recovery');
    setDinoState('healing');
    setRecoveryCompleted(false);
    setRecoveryPaused(false);
    setRecoverySecondsLeft(10);
    setRecoveryStarted(false);
    setRecoveryStepIndex(0);
    setSelectedRecoveryType(null);
    setTrainingStarted(false);
  };

  const completeTask = async (taskOverride?: TaskKind, recoveryTypeOverride?: RecoveryType | null) => {
    resetBreathing();
    setDinoState('happy');
    setReliefProgress(100);
    const previousLevel = getDinoLevel(xp);
    const rewardTask = taskOverride ?? completedTask ?? 'mood-check';
    const completion = await Recommendations.recordReliefCompletion({
      mood: selectedMood,
      moodHistory,
      reliefMethod: rewardTask,
      storageKeys: STORAGE_KEYS,
      todayCompleted,
      lastCompletedDate,
      recoveryType: recoveryTypeOverride,
      streak,
      wasTopPick: completedWasTopPick,
      xp,
    });
    const today = getTodayDateString();
    const newLevel = getDinoLevel(completion.nextXp);
    const earnedAchievementIds = getUnlockedAchievementIds({
      streak: completion.nextStreak,
      xp: completion.nextXp,
    });
    const nextAchievementIds = Array.from(
      new Set([...unlockedAchievementIds, ...earnedAchievementIds]),
    ) as AchievementId[];
    const justUnlockedAchievementIds = nextAchievementIds.filter(
      (achievementId) => !unlockedAchievementIds.includes(achievementId),
    );
    const nextCharacterUnlocks = resolveCharacterUnlockState({
      savedState: characterUnlocks,
      streak: completion.nextStreak,
      xp: completion.nextXp,
    });

    setCompletedTask(rewardTask);
    setXp(completion.nextXp);
    setStreak(completion.nextStreak);
    setCompletionReward({
      xp: completion.xpGain,
      alreadyCompleted: !completion.isFirstCompletionToday,
      leveledUp: newLevel > previousLevel,
    });
    setCompleteEncouragement(
      ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)],
    );
    setTodayCompleted(true);
    setLastCompletedDate(today);
    setCurrentStep('complete');
    setMoodHistory(completion.nextHistory);
    setUnlockedAchievementIds(nextAchievementIds);
    setNewAchievementIds(justUnlockedAchievementIds);
    setCharacterUnlocks(nextCharacterUnlocks);
    void AsyncStorage.multiSet([
      [STORAGE_KEYS.achievements, JSON.stringify(nextAchievementIds)],
      [STORAGE_KEYS.characterUnlocks, JSON.stringify(nextCharacterUnlocks)],
    ]);
  };

  const startTask = (task: TaskKind, wasTopPick = false) => {
    setCompletedWasTopPick(wasTopPick);

    if (task === 'coffee') {
      setCurrentStep('coffee');
      setCoffeeStarted(false);
      setCoffeeSecondsLeft(30);
    } else if (task === 'recovery') {
      setCurrentStep('recovery');
      setRecoveryCompleted(false);
      setRecoveryPaused(false);
      setRecoverySecondsLeft(10);
      setRecoveryStarted(false);
      setRecoveryStepIndex(0);
      setSelectedRecoveryType(null);
      setTrainingStarted(false);
    } else if (task === 'meditation') {
      setCurrentStep('meditation');
      setMeditationCompleted(false);
      setMeditationPaused(false);
      setSelectedMeditationMinutes(null);
      setMeditationSecondsLeft(0);
      setMeditationStarted(false);
    } else if (task === 'walk' || task === 'gaming' || task === 'music') {
      setPlaceholderTask(task);
      setCurrentStep('relief-placeholder');
    } else {
      setCurrentStep(task === 'breathing' ? 'breathing' : 'bubbles');
    }

    setReliefProgress(0);
    resetBreathing();
    resetBubbleAnimations();
    setPoppedBubbles([]);
    setCompletedTask(task);
    setDinoState('grumpy');
  };

  const handleBubblePress = (bubble: string) => {
    if (poppedBubbles.includes(bubble) || animatingBubbles.includes(bubble)) {
      return;
    }

    setDinoState('healing');
    setAnimatingBubbles((current) => [...current, bubble]);

    Animated.parallel([
      Animated.timing(bubbleOpacity[bubble], {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bubbleScale[bubble], {
        toValue: 0.8,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimatingBubbles((current) => current.filter((item) => item !== bubble));
      setPoppedBubbles((current) => {
        const nextPopped = [...current, bubble];
        const nextProgress = Math.min(nextPopped.length * 10, 100);
        setReliefProgress(nextProgress);

        if (nextPopped.length === STRESS_BUBBLE_WORDS.length) {
          void completeTask();
        }

        return nextPopped;
      });
    });
  };

  const selectedMoodData = moodOptions.find((item) => item.value === selectedMood) ?? null;
  const moodEmojiMap = getMoodDisplayMap();
  const currentLevel = getCurrentLevelInfo(xp);
  const currentOnboarding = ONBOARDING_PAGES[onboardingPage];
  const currentLevelGoal = currentLevel.xpMax === null ? currentLevel.xpMin : currentLevel.xpMax + 1;
  const currentLevelProgress = currentLevel.xpMax === null
    ? 1
    : Math.min((xp - currentLevel.xpMin) / (currentLevelGoal - currentLevel.xpMin), 1);
  const xpToNextLevel = currentLevel.nextLevel === null ? 0 : currentLevelGoal - xp;
  const unlockedAccessories = ACCESSORY_UNLOCKS.filter((item) => currentLevel.level >= item.level);
  const allUnlockedAccessoryLabels = unlockedAccessories.map((item) => item.label);
  const activeCharacterAccessories = getActiveCharacterAccessories(characterUnlocks.activeItem);
  const activeDeerSkin = getActiveDeerSkin(characterUnlocks.activeItem);
  const characterUnlockRecords = CHARACTER_UNLOCKS.filter(
    (item) => item.id !== DEFAULT_CHARACTER_ITEM_ID,
  ).map((item) => ({
    conditionLabel: item.conditionLabel,
    emoji: item.emoji,
    id: item.id,
    isUnlocked: characterUnlocks.unlockedItems.includes(item.id),
    title: item.title,
    unlockCopy: item.unlockCopy,
  }));
  const streakLabel = getStreakLabel(streak);
  const isPositiveMood = selectedMoodData?.tone === 'positive';
  const selectedMoodContent = selectedMood ? MOOD_CONTENT[selectedMood] : null;
  const currentTimeOfDay = getCurrentTimeOfDay();
  const personalizedRecommendations = selectedMood
    ? Recommendations.getPersonalizedRecommendations({
        currentTimeOfDay,
        selectedMood,
        userPreferences,
      })
    : [];
  const topRecommendation = personalizedRecommendations[0] ?? null;
  const otherRecommendations = personalizedRecommendations.slice(1, 4);
  const placeholderTaskTitle = placeholderTask ? getTaskDisplayTitle(placeholderTask) : 'Favorite Relief';
  const formattedCoffeeSeconds = `00:${String(coffeeSecondsLeft).padStart(2, '0')}`;
  const coffeeCompanionCopy = getCoffeeCompanionCopy(userPreferences.supportStyle);
  const meditationCompanionCopy = getMeditationCompanionCopy(userPreferences.supportStyle);
  const formattedMeditationTime = `${Math.floor(meditationSecondsLeft / 60)}:${String(
    meditationSecondsLeft % 60,
  ).padStart(2, '0')}`;
  const selectedRecoveryTraining =
    RECOVERY_TRAININGS.find((training) => training.key === selectedRecoveryType) ?? null;
  const currentRecoveryStep = selectedRecoveryTraining?.steps[recoveryStepIndex] ?? null;
  const formattedRecoverySeconds = `00:${String(recoverySecondsLeft).padStart(2, '0')}`;
  const meditationPhaseCopy = meditationCompleted
    ? 'You gave yourself a quiet moment.\n你给了自己一个安静的时刻。'
    : meditationPaused
      ? 'Paused. You can come back gently.\n暂停了，慢慢回来就好。'
      : meditationStarted
        ? 'Breathe gently with Dino.\n和小恐龙一起慢慢呼吸。'
        : 'Choose a tiny quiet moment.\n选择一个小小的安静时刻。';
  const currentBreathingPhase = BREATHING_PHASES[breathingPhaseIndex];
  const isTaskStep =
    currentStep === 'breathing' ||
    currentStep === 'bubbles' ||
    currentStep === 'coffee' ||
    currentStep === 'relief-placeholder' ||
    currentStep === 'recovery' ||
    currentStep === 'meditation';
  const isInfoStep = currentStep === 'history' || currentStep === 'about';
  const shouldShowStats =
    currentStep !== 'login' &&
    currentStep !== 'onboarding' &&
    currentStep !== 'preferences' &&
    currentStep !== 'home';
  const shouldScheduleReminders =
    currentStep !== 'login' && currentStep !== 'onboarding' && currentStep !== 'preferences';
  const dinoSize =
    currentStep === 'home'
      ? isCompact
        ? 192
        : 214
      : currentStep === 'onboarding'
        ? isCompact
          ? 162
          : 178
      : currentStep === 'preferences'
        ? isCompact
          ? 146
          : 164
      : currentStep === 'mood'
        ? isCompact
          ? 156
          : 172
        : currentStep === 'state'
          ? isCompact
            ? 164
            : 180
          : isInfoStep
            ? isCompact
              ? 144
              : 154
          : isTaskStep
            ? isCompact
              ? 136
              : 150
            : currentStep === 'complete'
              ? isCompact
                ? 158
                : 174
              : 180;
  const heroGap = currentStep === 'complete' ? 6 : 10;
  const cardPadding = currentStep === 'complete' ? 20 : currentStep === 'preferences' ? 18 : 22;
  const recentHistory = moodHistory.slice(0, 7);
  const completedTaskTitle = completedTask
    ? TASK_CONTENT[completedTask].title
    : TASK_CONTENT['mood-check'].title;
  const newAchievements = ACHIEVEMENTS.filter((achievement) =>
    newAchievementIds.includes(achievement.id),
  );
  const levelProgressWidth = levelProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const screenTranslateY = screenTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const shouldDecorateHero =
    currentStep === 'home' ||
    currentStep === 'complete' ||
    currentStep === 'coffee' ||
    currentStep === 'recovery' ||
    currentStep === 'meditation';
  const shouldShowGlobalHero = currentStep !== 'preferences' && currentStep !== 'home';
  const shouldShowDinoStatusCard =
    currentStep !== 'login' && currentStep !== 'preferences' && currentStep !== 'home';
  const coffeeDinoMood: DinoState = coffeeSecondsLeft === 0 ? 'happy' : coffeeStarted ? 'healing' : 'calm';

  useEffect(() => {
    Animated.timing(levelProgressAnim, {
      toValue: currentLevelProgress,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentLevelProgress, levelProgressAnim]);

  const heroContent: HeroContent =
    currentStep === 'login'
      ? {
          eyebrow: 'Demo login',
          title: 'Dino Calm',
          subtitle: '小恐龙松一口气',
        }
      : currentStep === 'home'
      ? {
          eyebrow: todayCompleted ? 'Already cared for today' : 'A tiny check-in is enough',
          title: 'How are you feeling today?',
          subtitle: '今天，让小恐龙陪你松一口气。',
        }
      : currentStep === 'preferences'
        ? {
            eyebrow: `Preference setup ${preferencePage + 1} / 3`,
            title: 'Help Dino learn your style.',
            subtitle: '告诉小恐龙你更喜欢怎样放松。',
          }
      : currentStep === 'mood'
        ? {
            eyebrow: 'Pick the closest feeling',
            title: 'Choose your mood softly.',
            subtitle: '选一个最接近此刻的心情就好。',
          }
        : currentStep === 'state'
          ? {
              eyebrow: selectedMoodData ? `${selectedMoodData.emoji} ${selectedMoodData.label}` : 'Mood check',
              title: 'Your dino checked in with you.',
              subtitle: '小恐龙已经接住你的感受了。',
            }
          : currentStep === 'breathing'
            ? {
                eyebrow: 'Breathing Balloon',
                title: 'Slow down one breath at a time.',
                subtitle: '跟着气球，慢慢吸气、停住、呼气。',
              }
            : currentStep === 'bubbles'
              ? {
                  eyebrow: 'Pop Stress Bubbles',
                  title: 'Let the little pressure float away.',
                  subtitle: '把小小的压力泡泡一个个戳掉吧。',
                }
              : currentStep === 'complete'
                ? {
                    eyebrow: completionReward.leveledUp ? 'Level up moment' : 'Gentle step completed',
                    title: 'A little calmer now.',
                    subtitle: '你和小恐龙都松了一口气。',
                  }
                : currentStep === 'coffee'
                  ? {
                      eyebrow: 'Favorite Relief',
                      title: 'Coffee with Dino',
                      subtitle: '和小恐龙喝杯咖啡',
                    }
                  : currentStep === 'relief-placeholder'
                    ? {
                        eyebrow: 'Favorite Relief preview',
                        title: placeholderTaskTitle,
                        subtitle: '这个喜欢的事情空间会在下一版展开。',
                      }
                    : currentStep === 'recovery'
                      ? {
                          eyebrow: 'Recovery Training',
                          title: 'Recovery Training with Deer',
                          subtitle: '和小鹿做放松训练',
                        }
                      : currentStep === 'meditation'
                        ? {
                            eyebrow: 'Meditation',
                            title: 'Meditate with Dino',
                            subtitle: '和小恐龙一起冥想',
                          }
                : currentStep === 'history'
                  ? {
                      eyebrow: 'Recent check-ins',
                      title: 'Mood History',
                      subtitle: '最近几次和小恐龙的温柔打卡。',
                    }
                  : currentStep === 'about'
                    ? {
                        eyebrow: 'About this tiny companion',
                        title: 'Dino Calm / 小恐龙松一口气',
                        subtitle: '一个温柔、轻量、不催促你的情绪陪伴小 App。',
                      }
                    : {
                        eyebrow: `Page ${onboardingPage + 1} / ${ONBOARDING_PAGES.length}`,
                        title: 'Welcome to Dino Calm',
                        subtitle: '和小恐龙一起，轻轻开始。',
                      };

  return (
    <FlowStateContext.Provider value={flowState}>
      <FlowDispatchContext.Provider value={flowDispatch}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: '#EEF8DD' }}
          edges={['top', 'left', 'right', 'bottom']}
        >
      {shouldScheduleReminders ? (
        <DailyReminder
          moodHistory={moodHistory}
          todayCompleted={todayCompleted}
          userPreferences={userPreferences}
        />
      ) : null}
      <StatusBar style="dark" />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: Math.max(insets.bottom + 44, 56),
          gap: 18,
        }}
      >
        {shouldShowStats ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 2,
              marginHorizontal: 2,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: '#FFF7C2',
                borderRadius: 24,
                padding: 16,
                minHeight: 84,
                justifyContent: 'space-between',
                boxShadow: '0 10px 18px rgba(208, 183, 77, 0.16)',
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: '#694D00',
                  lineHeight: 18,
                }}
              >
                🔥 Streak
              </Text>
              <Text
                selectable
                style={{
                  fontSize: isCompact ? 20 : 22,
                  fontWeight: '900',
                  color: '#694D00',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {streakLabel}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: '#D8F3C6',
                borderRadius: 24,
                padding: 16,
                minHeight: 84,
                justifyContent: 'space-between',
                boxShadow: '0 10px 18px rgba(88, 145, 65, 0.14)',
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: '#215628',
                  lineHeight: 18,
                }}
              >
                XP
              </Text>
              <Text
                selectable
                style={{
                  fontSize: isCompact ? 20 : 22,
                  fontWeight: '900',
                  color: '#215628',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {xp}
              </Text>
            </View>
          </View>
        ) : null}

        <Animated.View
          style={{
            backgroundColor: currentStep === 'home' ? '#FFFDF3' : '#FFFFFF',
            borderRadius: 32,
            padding: cardPadding,
            gap: currentStep === 'complete' ? 14 : 18,
            boxShadow: CARD_SHADOW,
            overflow: 'hidden',
            opacity: screenTransition,
            transform: [{ translateY: screenTranslateY }],
          }}
        >
          {shouldDecorateHero ? (
            <>
              <View
                style={{
                  position: 'absolute',
                  top: -54,
                  left: -42,
                  width: 150,
                  height: 150,
                  borderRadius: 999,
                  backgroundColor: '#DDF5C9',
                  opacity: 0.62,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 64,
                  right: -46,
                  width: 126,
                  height: 126,
                  borderRadius: 999,
                  backgroundColor: currentStep === 'complete' ? '#FFF1B8' : '#DDF3FF',
                  opacity: 0.58,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: -58,
                  right: 28,
                  width: 180,
                  height: 100,
                  borderRadius: 999,
                  backgroundColor: '#E5F6D5',
                  opacity: 0.44,
                }}
              />
            </>
          ) : null}

          {shouldShowGlobalHero ? (
          <View style={{ alignItems: 'center', gap: heroGap }}>
            <Animated.View
              style={{
                minHeight: isTaskStep
                  ? dinoSize * 1.02
                  : currentStep === 'complete'
                    ? dinoSize * 1.04
                    : dinoSize * 1.08,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: dinoBounce }],
              }}
            >
              <DinoAvatar
                accessories={[]}
                state={dinoState}
                size={dinoSize}
              />
            </Animated.View>
            <Text
              selectable
              style={{
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                textAlign: 'center',
                color: '#7A927A',
              }}
            >
              {heroContent.eyebrow}
            </Text>
            <Text
              selectable
              style={{
                fontSize: currentStep === 'complete' ? 24 : 28,
                fontWeight: '900',
                textAlign: 'center',
                color: '#183826',
                paddingHorizontal: 8,
                maxWidth: 340,
              }}
            >
              {heroContent.title}
            </Text>
            <Text
              selectable
              style={{
                fontSize: 16,
                lineHeight: 23,
                textAlign: 'center',
                color: '#5B7562',
                paddingHorizontal: 8,
                maxWidth: 360,
              }}
            >
              {heroContent.subtitle}
            </Text>
          </View>
          ) : null}

          {shouldShowDinoStatusCard ? (
          <View
            style={{
              backgroundColor: '#F6FAF0',
              borderRadius: 24,
              padding: 18,
              gap: 6,
            }}
          >
            <Text
              selectable
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: '#24412E',
              }}
            >
              Dino Calm / 小恐龙松一口气
            </Text>
            <Text
              selectable
              style={{
                fontSize: 15,
                lineHeight: 21,
                color: '#5A6F62',
              }}
            >
              {currentStep === 'complete'
                ? '你帮小恐龙松了一口气。'
                : DINO_STATE_COPY[dinoState]}
              </Text>
          </View>
          ) : null}

          {currentStep === 'login' ? (
            <View style={{ gap: 14 }}>
              <Text
                selectable
                style={{
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: '#91A28E',
                  textAlign: 'center',
                }}
              >
                Demo login
              </Text>
              <View
                style={{
                  backgroundColor: '#F8FFF1',
                  borderRadius: 24,
                  padding: 18,
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 24,
                    fontWeight: '900',
                    color: '#183826',
                    textAlign: 'center',
                  }}
                >
                  Dino Calm
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#35503A',
                    textAlign: 'center',
                  }}
                >
                  小恐龙松一口气
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: '#617866',
                    textAlign: 'center',
                  }}
                >
                  A tiny dino companion for your stress relief.
                  {'\n'}
                  陪你记录压力，也陪你慢慢松一口气。
                </Text>
              </View>

              <PrimaryButton
                label=" Continue with Apple 使用 Apple 登录"
                onPress={handleMockLogin}
                backgroundColor="#183826"
                textColor="#FFFFFF"
              />
              <PrimaryButton
                label="💬 Continue with WeChat 使用微信登录"
                onPress={handleMockLogin}
                backgroundColor="#CFF1BF"
                textColor="#214D2A"
              />
              <PrimaryButton
                label="📱 Continue with Phone 使用手机号登录"
                onPress={handleMockLogin}
                backgroundColor="#FFF2A6"
                textColor="#5A4600"
              />
            </View>
          ) : null}

          {currentStep === 'preferences' ? (
            <View style={{ gap: 14 }}>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <DinoAvatar state="calm" size={isCompact ? 82 : 92} />
                <Text
                  selectable
                  style={{
                    fontSize: 11,
                    fontWeight: '900',
                    color: '#789174',
                    letterSpacing: 0.7,
                    textTransform: 'uppercase',
                  }}
                >
                  Preference Setup {preferencePage + 1}/3
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 24,
                    fontWeight: '900',
                    color: '#183826',
                    textAlign: 'center',
                  }}
                >
                  Help Dino learn your style.
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: '#F8FBF3',
                  borderRadius: 24,
                  padding: 16,
                  gap: 8,
                  borderWidth: 2,
                  borderColor: '#E0EED6',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 18,
                    fontWeight: '900',
                    color: '#183826',
                    textAlign: 'center',
                  }}
                >
                  {preferencePage === 0
                    ? 'How do you usually like to release stress?'
                    : preferencePage === 1
                      ? 'What kind of support do you prefer from Dino?'
                      : 'When should Dino gently remind you?'}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#35503A',
                    textAlign: 'center',
                    lineHeight: 23,
                  }}
                >
                  {preferencePage === 0
                    ? '你平时喜欢通过什么方式解压？'
                    : preferencePage === 1
                      ? '你希望小恐龙怎样陪你？'
                      : '选择压力高发时间，也可以设置提醒时间。'}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {preferencePage === 0
                  ? FAVORITE_RELIEF_OPTIONS.map((option) => {
                      const isSelected = favoriteReliefMethods.includes(option.value);

                      return (
                        <ScalePressable
                          key={option.value}
                          onPress={() => toggleFavoriteReliefMethod(option.value)}
                          style={{
                            backgroundColor: isSelected ? '#E3FFD3' : '#FFFFFF',
                            borderRadius: 22,
                            paddingVertical: 13,
                            paddingHorizontal: 16,
                            borderWidth: 2,
                            borderColor: isSelected ? '#4FAE49' : '#DDEAD4',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            opacity: isSelected ? 1 : 0.92,
                          }}
                        >
                          <Text selectable style={{ fontSize: 19 }}>
                            {option.emoji}
                          </Text>
                          <Text
                            selectable
                            style={{
                              flex: 1,
                              fontSize: 16,
                              fontWeight: '800',
                              color: isSelected ? '#173D22' : '#4B604E',
                            }}
                          >
                            {option.label} {option.subLabel}
                          </Text>
                          <Text
                            selectable
                            style={{
                              fontSize: 14,
                              fontWeight: '900',
                              color: isSelected ? '#236E2B' : '#8A9B87',
                            }}
                          >
                            {isSelected ? 'Picked ✓' : 'Pick'}
                          </Text>
                        </ScalePressable>
                      );
                    })
                  : null}

                {preferencePage === 1
                  ? SUPPORT_STYLE_OPTIONS.map((option) => {
                      const isSelected = supportStyle === option.value;

                      return (
                        <ScalePressable
                          key={option.value}
                          onPress={() => {
                            setPreferenceError('');
                            setSupportStyle(option.value);
                          }}
                          style={{
                            backgroundColor: isSelected ? '#E3FFD3' : '#FFFFFF',
                            borderRadius: 22,
                            paddingVertical: 15,
                            paddingHorizontal: 16,
                            borderWidth: 2,
                            borderColor: isSelected ? '#4FAE49' : '#DDEAD4',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            opacity: isSelected ? 1 : 0.92,
                          }}
                        >
                          <Text selectable style={{ fontSize: 19 }}>
                            {option.emoji}
                          </Text>
                          <Text
                            selectable
                            style={{
                              flex: 1,
                              fontSize: 16,
                              fontWeight: '800',
                              color: isSelected ? '#173D22' : '#4B604E',
                              lineHeight: 22,
                            }}
                          >
                            {option.label}
                            {'\n'}
                            {option.subLabel}
                          </Text>
                          <Text
                            selectable
                            style={{
                              fontSize: 14,
                              fontWeight: '900',
                              color: isSelected ? '#236E2B' : '#8A9B87',
                            }}
                          >
                            {isSelected ? 'Chosen ✓' : 'Choose'}
                          </Text>
                        </ScalePressable>
                      );
                    })
                  : null}

                {preferencePage === 2
                  ? STRESS_TIME_OPTIONS.map((option) => {
                      const isSelected = stressTime === option.value;

                      return (
                        <ScalePressable
                          key={option.value}
                          onPress={() => {
                            setPreferenceError('');
                            setStressTime(option.value);
                            setReminderTime(DEFAULT_REMINDER_TIME_BY_STRESS_TIME[option.value]);
                          }}
                          style={{
                            backgroundColor: isSelected ? '#E3FFD3' : '#FFFFFF',
                            borderRadius: 22,
                            paddingVertical: 15,
                            paddingHorizontal: 16,
                            borderWidth: 2,
                            borderColor: isSelected ? '#4FAE49' : '#DDEAD4',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            opacity: isSelected ? 1 : 0.92,
                          }}
                        >
                          <Text selectable style={{ fontSize: 19 }}>
                            {option.emoji}
                          </Text>
                          <Text
                            selectable
                            style={{
                              flex: 1,
                              fontSize: 16,
                              fontWeight: '800',
                              color: isSelected ? '#173D22' : '#4B604E',
                            }}
                          >
                            {option.label} {option.subLabel}
                          </Text>
                          <Text
                            selectable
                            style={{
                              fontSize: 14,
                              fontWeight: '900',
                              color: isSelected ? '#236E2B' : '#8A9B87',
                            }}
                          >
                            {isSelected ? 'Chosen ✓' : 'Choose'}
                          </Text>
                        </ScalePressable>
                      );
                    })
                  : null}

                {preferencePage === 2 ? (
                  <View
                    style={{
                      backgroundColor: '#F8FBF3',
                      borderRadius: 22,
                      padding: 14,
                      gap: 10,
                      borderWidth: 1,
                      borderColor: '#DFEBDC',
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        fontSize: 15,
                        fontWeight: '900',
                        color: '#35503A',
                        textAlign: 'center',
                      }}
                    >
                      Daily reminder time 每日提醒时间
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                        justifyContent: 'center',
                      }}
                    >
                      {REMINDER_TIME_OPTIONS.map((option) => {
                        const isSelected = reminderTime === option.value;

                        return (
                          <ScalePressable
                            key={option.value}
                            onPress={() => {
                              setPreferenceError('');
                              setReminderTime(option.value);
                            }}
                            style={{
                              minWidth: 132,
                              backgroundColor: isSelected ? '#E3FFD3' : '#FFFFFF',
                              borderRadius: 18,
                              paddingVertical: 11,
                              paddingHorizontal: 12,
                              borderWidth: 2,
                              borderColor: isSelected ? '#4FAE49' : '#DDEAD4',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text selectable style={{ fontSize: 18 }}>
                              {option.emoji}
                            </Text>
                            <Text
                              selectable
                              style={{
                                fontSize: 15,
                                fontWeight: '900',
                                color: isSelected ? '#173D22' : '#4B604E',
                              }}
                            >
                              {option.label}
                            </Text>
                            <Text
                              selectable
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: isSelected ? '#236E2B' : '#7A8D79',
                              }}
                            >
                              {option.subLabel}
                            </Text>
                          </ScalePressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {[0, 1, 2].map((index) => (
                  <View
                    key={index}
                    style={{
                      width: index === preferencePage ? 24 : 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: index === preferencePage ? '#69C651' : '#D6E8C9',
                    }}
                  />
                ))}
              </View>

              {preferenceError ? (
                <View
                  style={{
                    borderRadius: 18,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: '#FFF2EC',
                    borderWidth: 1,
                    borderColor: '#F3C2B5',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: '800',
                      color: '#8A4B3E',
                      textAlign: 'center',
                    }}
                  >
                    {preferenceError}
                  </Text>
                </View>
              ) : null}

              <PrimaryButton
                label={
                  preferencePage === 2
                    ? 'Start My Dino Calm 开始我的小恐龙陪伴'
                    : 'Continue 继续'
                }
                onPress={goToNextPreferenceStep}
              />
            </View>
          ) : null}

          {currentStep === 'home' ? (
            <HomeScreen
              activeCharacterAccessories={activeCharacterAccessories}
              buttonScales={homeButtonScales}
              currentLevel={currentLevel}
              dinoBounce={dinoBounce}
              dinoState={dinoState}
              isCompact={isCompact}
              onOpenMood={openMoodSelection}
              onOpenPanel={openHomePanel}
              onOpenRecovery={openRecoveryTraining}
              streakLabel={streakLabel}
              xp={xp}
            />
          ) : null}

          {currentStep === 'history' ? (
            <View style={{ gap: 14 }}>
              {recentHistory.length > 0 ? (
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    textAlign: 'center',
                    color: '#6A806E',
                  }}
                >
                  These are the latest gentle check-ins you completed with your dino.
                </Text>
              ) : null}

              {recentHistory.map((entry) => (
                <View
                  key={entry.date}
                  style={{
                    backgroundColor: '#F7FBF2',
                    borderRadius: 24,
                    padding: 16,
                    gap: 6,
                    boxShadow: SOFT_SHADOW,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#5A7160',
                    }}
                  >
                    Date: {formatHistoryDate(entry.date)}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: '#25422E',
                    }}
                  >
                    Mood: {moodEmojiMap[entry.mood]}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      color: '#486054',
                      lineHeight: 21,
                    }}
                  >
                    Relief: {getTaskDisplayTitle(entry.reliefMethod ?? entry.task ?? 'mood-check')}
                  </Text>
                  {entry.recoveryType ? (
                    <Text
                      selectable
                      style={{
                        fontSize: 14,
                        color: '#5F7565',
                        lineHeight: 20,
                      }}
                    >
                      Recovery:{' '}
                      {getRecoveryTrainingTitle(entry.recoveryType)}
                    </Text>
                  ) : null}
                  <Text
                    selectable
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: '#70826F',
                    }}
                  >
                    You came back today. That matters.
                  </Text>
                </View>
              ))}

              {recentHistory.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#F8FBF3',
                    borderRadius: 24,
                    padding: 20,
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      textAlign: 'center',
                      color: '#35503A',
                    }}
                  >
                    No check-ins yet.
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      textAlign: 'center',
                      color: '#758A79',
                    }}
                  >
                    Your first gentle step will show up here.
                    {'\n'}
                    第一次温柔打卡会出现在这里。
                  </Text>
                </View>
              ) : null}

              <PrimaryButton
                label="About 关于"
                onPress={() => setCurrentStep('about')}
                backgroundColor="#F0F7E8"
                textColor="#35503A"
              />
              <PrimaryButton label="Back Home 回到首页" onPress={goHome} />
            </View>
          ) : null}

          {currentStep === 'about' ? (
            <View style={{ gap: 14 }}>
              <Text
                selectable
                style={{
                  fontSize: 24,
                  fontWeight: '900',
                  textAlign: 'center',
                  color: '#183826',
                }}
              >
                Dino Calm / 小恐龙松一口气
              </Text>
              <View
                style={{
                  backgroundColor: '#F8FBF3',
                  borderRadius: 24,
                  padding: 18,
                  gap: 10,
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 23,
                    color: '#5C7461',
                  }}
                >
                  Dino Calm is a gentle companion app that helps you notice your mood and take tiny calming steps.
                  {'\n'}
                  Dino Calm 是一个轻量、温柔的情绪陪伴 App，帮助你记录心情，并完成小小的放松练习。
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#26442D',
                  }}
                >
                  Important note:
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 23,
                    color: '#5C7461',
                  }}
                >
                  This app offers support and calming prompts, but it does not provide medical diagnosis, treatment, or therapy.
                  {'\n'}
                  如果你正在经历严重或持续的心理痛苦，请及时联系专业人士寻求帮助。
                </Text>
              </View>
              <PrimaryButton label="Back Home 回到首页" onPress={goHome} />
              <ScalePressable
                onPress={() => {
                  void AsyncStorage.removeItem(STORAGE_KEYS.hasSeenOnboarding);
                  setOnboardingPage(0);
                  setCurrentStep('onboarding');
                }}
                style={{
                  alignSelf: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: '#F4F7EE',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#70826F',
                  }}
                >
                  Reset Onboarding 重置首次体验
                </Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => {
                  void AsyncStorage.multiRemove([
                    STORAGE_KEYS.hasCompletedPreferenceSetup,
                    STORAGE_KEYS.userPreferences,
                  ]);
                  setPreferencePage(0);
                  setFavoriteReliefMethods([]);
                  setSupportStyle(null);
                  setStressTime(null);
                  setReminderTime(DEFAULT_USER_PREFERENCES.reminderTime ?? '20:00');
                  setCurrentStep('preferences');
                }}
                style={{
                  alignSelf: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: '#F4F7EE',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#70826F',
                  }}
                >
                  Reset Preferences 重置偏好问卷
                </Text>
              </ScalePressable>
              <ScalePressable
                onPress={() => {
                  void AsyncStorage.removeItem(STORAGE_KEYS.hasLoggedIn);
                  setCurrentStep('login');
                }}
                style={{
                  alignSelf: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: '#F4F7EE',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#70826F',
                  }}
                >
                  Reset Login Mock 重置登录 Mock
                </Text>
              </ScalePressable>
            </View>
          ) : null}

          {currentStep === 'onboarding' ? (
            <View style={{ gap: 16 }}>
              <View
                style={{
                  backgroundColor: '#F8FBF3',
                  borderRadius: 24,
                  padding: 20,
                  gap: 12,
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 26,
                    fontWeight: '900',
                    color: '#183826',
                    textAlign: 'center',
                  }}
                >
                  {currentOnboarding.title}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#35503A',
                    textAlign: 'center',
                  }}
                >
                  {currentOnboarding.chineseTitle}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 23,
                    color: '#5E775F',
                    textAlign: 'center',
                  }}
                >
                  {currentOnboarding.description}
                  {'\n'}
                  {currentOnboarding.chineseDescription}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {ONBOARDING_PAGES.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: index === onboardingPage ? 24 : 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: index === onboardingPage ? '#69C651' : '#D6E8C9',
                    }}
                  />
                ))}
              </View>

              <PrimaryButton
                label={onboardingPage === ONBOARDING_PAGES.length - 1 ? 'Start with Dino 开始' : 'Continue 继续'}
                onPress={() => {
                  if (onboardingPage === ONBOARDING_PAGES.length - 1) {
                    void AsyncStorage.setItem(STORAGE_KEYS.hasSeenOnboarding, 'true');
                    setOnboardingPage(0);
                    setCurrentStep('preferences');
                    return;
                  }

                  setOnboardingPage((page) => page + 1);
                }}
              />
            </View>
          ) : null}

          {currentStep === 'mood' ? (
            <MoodSelector
              moods={RESTORED_MOOD_OPTIONS}
              onSelectMood={handleSelectMood}
              selectedMood={selectedMood}
            />
          ) : null}

          {currentStep === 'state' && selectedMoodData ? (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  backgroundColor: isPositiveMood ? '#F3FFE6' : '#FFF4EF',
                  borderRadius: 24,
                  padding: 16,
                  gap: 8,
                }}
              >
                  <Text
                    selectable
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      lineHeight: 24,
                      color: '#24412E',
                    }}
                  >
                    Today you picked: {selectedMoodData.emoji} {selectedMoodData.label}{' '}
                    {selectedMoodData.subLabel}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 18,
                      fontWeight: '800',
                      lineHeight: 24,
                      color: '#365040',
                    }}
                  >
                    {selectedMoodContent?.title}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      color: '#627763',
                    }}
                  >
                    {selectedMoodContent?.english}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      color: '#627763',
                    }}
                  >
                    {selectedMoodContent?.description}
                  </Text>
              </View>

              <View style={{ gap: 12 }}>
                <Text
                  selectable
                  style={{
                    fontSize: 18,
                    fontWeight: '900',
                    color: '#183826',
                    textAlign: 'center',
                  }}
                >
                  Dino recommends for you
                  {'\n'}
                  小恐龙为你推荐
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: '#6B806E',
                    textAlign: 'center',
                  }}
                >
                  {getSupportStyleCopy(userPreferences.supportStyle)}
                  {'\n'}
                  Usually stressed: {getStressTimeCopy(userPreferences.stressTime)}
                </Text>

                {topRecommendation ? (
                  <ScalePressable
                    onPress={() => startTask(topRecommendation.id, topRecommendation.isTopPick)}
                    style={{
                      backgroundColor: '#FFF7D8',
                      borderRadius: 26,
                      padding: 18,
                      gap: 10,
                      borderWidth: 2,
                      borderColor: '#F1D46E',
                      boxShadow: '0 12px 22px rgba(160, 132, 52, 0.14)',
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        fontSize: 13,
                        fontWeight: '900',
                        color: '#8A6500',
                        textTransform: 'uppercase',
                      }}
                    >
                      ⭐ Top Pick
                      {'\n'}
                      推荐的最佳方式
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        fontWeight: '900',
                        color: '#6B560F',
                      }}
                    >
                      Dino picked this for you today.
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 20,
                        fontWeight: '900',
                        color: '#3C4C2F',
                      }}
                    >
                      {topRecommendation.title}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: '#536344',
                      }}
                    >
                      {topRecommendation.subtitle}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 15,
                        lineHeight: 22,
                        color: '#6F6B51',
                      }}
                    >
                      {topRecommendation.reason}
                    </Text>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 999,
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          fontSize: 14,
                          fontWeight: '900',
                          color: '#5A4600',
                        }}
                      >
                        Start 开始
                      </Text>
                    </View>
                  </ScalePressable>
                ) : null}

                {otherRecommendations.length > 0 ? (
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '900',
                      color: '#4D654F',
                    }}
                  >
                    Other gentle choices:
                    {'\n'}
                    其他温柔选择
                  </Text>
                ) : null}

                {otherRecommendations.map((recommendation) => (
                  <ScalePressable
                    key={recommendation.id}
                    onPress={() => startTask(recommendation.id, recommendation.isTopPick)}
                    style={{
                      backgroundColor: '#F8FBF3',
                      borderRadius: 24,
                      padding: 16,
                      gap: 7,
                      borderWidth: 2,
                      borderColor: '#E1ECD8',
                      boxShadow: '0 8px 14px rgba(101, 128, 89, 0.08)',
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        fontSize: 17,
                        fontWeight: '900',
                        color: '#24412E',
                      }}
                    >
                      {recommendation.title}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: '#526852',
                      }}
                    >
                      {recommendation.subtitle}
                    </Text>
                    <Text
                      selectable
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: '#6B806E',
                      }}
                    >
                      {recommendation.reason}
                    </Text>
                  </ScalePressable>
                ))}
              </View>

              {isPositiveMood ? (
                <>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      color: '#4E6753',
                      textAlign: 'center',
                    }}
                  >
                    Your dino is smiling with you today.
                  </Text>
                  <PrimaryButton
                    label={todayCompleted ? 'Today completed 今天已完成' : '完成今日记录'}
                    onPress={() => {
                      setCompletedTask('mood-check');
                      void completeTask();
                    }}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          {currentStep === 'breathing' ? (
            <View style={{ gap: 14, alignItems: 'center' }}>
              <View style={{ width: '100%', gap: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#24412E',
                    }}
                  >
                    Dino Relief
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#4D7054',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {reliefProgress}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: '#DCEFD2',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${reliefProgress}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: '#69C651',
                    }}
                  />
                </View>
              </View>

              <View
                style={{
                  width: isCompact ? 170 : 200,
                  height: isCompact ? 170 : 200,
                  borderRadius: 999,
                  backgroundColor: currentBreathingPhase.color,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 16px 28px rgba(77, 140, 176, 0.18)',
                  transform: [
                    {
                      scale:
                        currentBreathingPhase.english === 'Inhale'
                          ? 1
                          : currentBreathingPhase.english === 'Hold'
                            ? 0.94
                            : 0.86,
                    },
                  ],
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 28,
                    fontWeight: '900',
                    color: '#173849',
                  }}
                >
                  {breathingStarted ? currentBreathingPhase.english : 'Ready'}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#2A5568',
                  }}
                >
                  {breathingStarted ? currentBreathingPhase.chinese : '呼吸气球'}
                </Text>
              </View>

              <Text
                selectable
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#23442E',
                  fontVariant: ['tabular-nums'],
                }}
              >
                Round {breathingRound} / 3
              </Text>

              <Text
                selectable
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center',
                  color: '#647866',
                }}
              >
                {breathingStarted
                  ? 'Follow the prompt and let the dino soften with you.'
                  : 'Tap start when you want a slow, simple breathing loop.'}
              </Text>

              <View style={{ width: '100%', gap: 10 }}>
                <PrimaryButton
                  label={breathingStarted ? 'Restart 重新开始呼吸' : 'Start Breathing 开始'}
                  onPress={() => {
                    resetBreathing();
                    setCurrentStep('breathing');
                    setReliefProgress(0);
                    setDinoState('grumpy');
                    setBreathingStarted(true);
                  }}
                  backgroundColor="#7FD6F6"
                  textColor="#173C4E"
                />
                <PrimaryButton
                  label="Finish Gently 温柔完成"
                  onPress={() => {
                    void completeTask();
                  }}
                  backgroundColor="#FFF2A6"
                  textColor="#5A4600"
                />
              </View>
            </View>
          ) : null}

          {currentStep === 'bubbles' ? (
            <View style={{ gap: 14 }}>
              <View style={{ width: '100%', gap: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#24412E',
                    }}
                  >
                    Dino Relief
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: '#4D7054',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {reliefProgress}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: '#DCEFD2',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${reliefProgress}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: '#69C651',
                    }}
                  />
                </View>
              </View>

              <Text
                selectable
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  textAlign: 'center',
                  color: '#5F6F66',
                }}
              >
                Tap all 10 bubbles to help the little dino let the pressure float away.
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                  justifyContent: 'center',
                  paddingVertical: 4,
                }}
              >
                {STRESS_BUBBLE_WORDS.map((bubble, index) => {
                  const popped = poppedBubbles.includes(bubble);

                  if (popped) {
                    return null;
                  }

                  return (
                    <ScalePressable
                      key={bubble}
                      onPress={() => handleBubblePress(bubble)}
                      animatedOpacity={bubbleOpacity[bubble]}
                      extraScale={bubbleScale[bubble]}
                      style={{
                        minWidth: index % 3 === 0 ? 120 : 96,
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        backgroundColor: index % 2 === 0 ? '#CDEFFF' : '#FFD8EA',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 18px rgba(102, 136, 168, 0.14)',
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#2C4860',
                        }}
                      >
                        {bubble}
                      </Text>
                    </ScalePressable>
                  );
                })}
              </View>

              <Text
                selectable
                style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: '700',
                  color: '#5A6E61',
                  fontVariant: ['tabular-nums'],
                }}
              >
                Popped {poppedBubbles.length} / {STRESS_BUBBLE_WORDS.length}
              </Text>
              <Text
                selectable
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  lineHeight: 20,
                  color: '#78907A',
                }}
              >
                One gentle step today.
              </Text>
            </View>
          ) : null}

          {currentStep === 'coffee' ? (
            <CoffeeScene
              accessories={activeCharacterAccessories}
              companionCopy={coffeeCompanionCopy}
              dinoMood={coffeeDinoMood}
              formattedSeconds={formattedCoffeeSeconds}
              isCompact={isCompact}
              isRunning={coffeeStarted}
              onBack={() => setCurrentStep('state')}
              onComplete={() => {
                void completeTask('coffee');
              }}
              onPause={() => setCoffeeStarted(false)}
              onStart={() => {
                setCoffeeStarted(true);
                setDinoState('healing');
              }}
              secondsLeft={coffeeSecondsLeft}
            />
          ) : null}

          {currentStep === 'relief-placeholder' ? (
            <View style={{ gap: 14, alignItems: 'center' }}>
              <View
                style={{
                  width: '100%',
                  backgroundColor: placeholderTask ? TASK_CONTENT[placeholderTask].color : '#F8FBF3',
                  borderRadius: 28,
                  padding: 22,
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Text selectable style={{ fontSize: 44 }}>
                  {placeholderTask === 'walk' ? '🚶' : placeholderTask === 'gaming' ? '🎮' : '🎵'}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: placeholderTask ? TASK_CONTENT[placeholderTask].textColor : '#24412E',
                    textAlign: 'center',
                  }}
                >
                  {placeholderTaskTitle}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: '#657766',
                    textAlign: 'center',
                  }}
                >
                  This favorite relief space is a placeholder for the next version.
                  {'\n'}
                  Coming soon. For now, try breathing instead.
                  {'\n'}
                  即将开放。现在可以先和小恐龙做一次轻轻呼吸。
                </Text>
              </View>

              <View style={{ width: '100%', gap: 10 }}>
                <PrimaryButton
                  label="Try Breathing Instead 先试试呼吸"
                  onPress={() => startTask('breathing', completedWasTopPick)}
                />
                <PrimaryButton
                  label="Back to Recommendations 返回推荐"
                  onPress={() => setCurrentStep('state')}
                  backgroundColor="#F0F7E8"
                  textColor="#35503A"
                />
              </View>
            </View>
          ) : null}

          {currentStep === 'recovery' ? (
            <DeerRecoveryScene
              currentStep={currentRecoveryStep}
              deerSkin={activeDeerSkin}
              formattedSeconds={formattedRecoverySeconds}
              isCompact={isCompact}
              onChooseAnother={() => {
                setRecoveryCompleted(false);
                setRecoveryPaused(false);
                setRecoverySecondsLeft(10);
                setRecoveryStarted(false);
                setRecoveryStepIndex(0);
                setSelectedRecoveryType(null);
              }}
              onComplete={() => {
                if (!selectedRecoveryTraining) {
                  return;
                }

                setRecoveryCompleted(true);
                setRecoveryPaused(false);
                setRecoveryStarted(false);
                void completeTask('recovery', selectedRecoveryTraining.key);
              }}
              onNextStep={() => {
                if (!selectedRecoveryTraining) {
                  return;
                }

                setRecoveryPaused(false);
                setRecoverySecondsLeft(10);
                setRecoveryStarted(false);
                setRecoveryStepIndex((step) =>
                  Math.min(step + 1, selectedRecoveryTraining.steps.length - 1),
                );
              }}
              onPause={() => {
                setRecoveryPaused(true);
                setRecoveryStarted(false);
              }}
              onSelectTraining={(training) => {
                setRecoveryCompleted(false);
                setRecoveryPaused(false);
                setRecoverySecondsLeft(10);
                setRecoveryStarted(false);
                setRecoveryStepIndex(0);
                setSelectedRecoveryType(training.key);
                setTrainingStarted(false);
              }}
              onStart={() => {
                setRecoveryCompleted(false);
                setRecoveryPaused(false);
                setRecoveryStarted(true);
                setTrainingStarted(true);
                setDinoState('healing');
              }}
              recoveryCompleted={recoveryCompleted}
              recoveryPaused={recoveryPaused}
              recoveryStarted={recoveryStarted}
              selectedTraining={selectedRecoveryTraining}
              stepIndex={recoveryStepIndex}
              trainings={RECOVERY_TRAININGS}
            />
          ) : null}

          {currentStep === 'meditation' ? (
            <MeditationScene
              accessories={activeCharacterAccessories}
              companionCopy={meditationCompanionCopy}
              formattedTime={formattedMeditationTime}
              isCompact={isCompact}
              isPaused={meditationPaused}
              isRunning={meditationStarted}
              meditationCompleted={meditationCompleted}
              onBack={() => setCurrentStep('state')}
              onComplete={() => {
                void completeTask('meditation');
              }}
              onPause={() => {
                if (meditationStarted) {
                  setMeditationPaused(true);
                  setMeditationStarted(false);
                }
              }}
              onReset={() => {
                const resetSeconds = selectedMeditationMinutes ? selectedMeditationMinutes * 60 : 0;
                setMeditationCompleted(false);
                setMeditationPaused(false);
                setMeditationSecondsLeft(resetSeconds);
                setMeditationStarted(false);
              }}
              onSelectMinutes={(selectedMinutes) => {
                setSelectedMeditationMinutes(selectedMinutes);
                setMeditationCompleted(false);
                setMeditationPaused(false);
                setMeditationSecondsLeft(selectedMinutes * 60);
                setMeditationStarted(false);
                setDinoState('healing');
              }}
              onStart={() => {
                if (selectedMeditationMinutes === null) {
                  setSelectedMeditationMinutes(1);
                  setMeditationSecondsLeft(60);
                }
                setMeditationCompleted(false);
                setMeditationPaused(false);
                setMeditationStarted(true);
                setDinoState('healing');
              }}
              phaseCopy={meditationPhaseCopy}
              selectedMinutes={selectedMeditationMinutes}
            />
          ) : null}

          {currentStep === 'complete' ? (
            <View style={{ gap: 12, alignItems: 'center' }}>
              <View
                style={{
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: completionReward.leveledUp ? '#FFF2A6' : '#E9FAD9',
                  borderWidth: 1,
                  borderColor: completionReward.leveledUp ? '#F1D966' : '#CCE9B4',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    fontWeight: '900',
                    color: completionReward.leveledUp ? '#705400' : '#3E693F',
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {completionReward.leveledUp ? 'New accessory unlocked soon' : 'Care saved locally'}
                </Text>
              </View>
              <Text
                selectable
                style={{
                  fontSize: 23,
                  fontWeight: '900',
                  textAlign: 'center',
                  color: '#183825',
                }}
              >
                你帮小恐龙松了一口气。
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 17,
                  textAlign: 'center',
                  color: '#5A7461',
                }}
              >
                You helped your dino feel better.
              </Text>
              {completedWasTopPick ? (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#FFF7D8',
                    borderRadius: 22,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#F1D46E',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      lineHeight: 21,
                      fontWeight: '900',
                      color: '#6B560F',
                      textAlign: 'center',
                    }}
                  >
                    Dino picked this for you today.
                    {'\n'}
                    这是小恐龙今天为你推荐的方式。
                  </Text>
                </View>
              ) : null}

              {newAchievements.length > 0 ? (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFDF3',
                    borderRadius: 22,
                    padding: 14,
                    gap: 8,
                    borderWidth: 2,
                    borderColor: '#EFE6BB',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '900',
                      color: '#6F5C17',
                      textAlign: 'center',
                    }}
                  >
                    New achievement unlocked
                    {'\n'}
                    新成就解锁
                  </Text>
                  {newAchievements.map((achievement) => (
                    <Text
                      key={achievement.id}
                      selectable
                      style={{
                        fontSize: 15,
                        lineHeight: 21,
                        fontWeight: '800',
                        color: '#2E442D',
                        textAlign: 'center',
                      }}
                    >
                      {achievement.emoji} {achievement.title}
                      {'\n'}
                      {achievement.unlockCopy}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  width: '100%',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#E3FFD3',
                    borderRadius: 22,
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 24,
                      fontWeight: '900',
                      color: '#1F6B2C',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    +{completionReward.xp} XP
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFF5BA',
                    borderRadius: 22,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: completionReward.alreadyCompleted ? 16 : 22,
                      fontWeight: '900',
                      color: '#7B5A00',
                      textAlign: 'center',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {completionReward.alreadyCompleted
                      ? 'Streak kept today'
                      : '🔥 +1 day'}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: '700',
                      color: '#8A6B10',
                      textAlign: 'center',
                    }}
                  >
                    {completionReward.alreadyCompleted
                      ? '今天的连续天数已经记过啦。'
                      : '连续打卡增加 1 天。'}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  width: '100%',
                  backgroundColor: '#F8FFF1',
                  borderRadius: 24,
                  padding: 16,
                  gap: 8,
                  borderWidth: 2,
                  borderColor: '#E1F0D5',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 13,
                    fontWeight: '900',
                    color: '#68815E',
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  Completed with Dino
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 17,
                    fontWeight: '900',
                    color: '#24412E',
                  }}
                >
                  {completedTaskTitle}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: '#667B68',
                  }}
                >
                  {completionReward.alreadyCompleted
                    ? 'Extra practice counts too: a small refill for your dino and your day.'
                    : 'This first gentle step today was added to your check-in story.'}
                </Text>
              </View>

              <Text
                selectable
                style={{
                  fontSize: 15,
                  lineHeight: 23,
                  color: '#5D7061',
                  textAlign: 'center',
                }}
              >
                {completionReward.alreadyCompleted
                  ? 'Relax practice completed.\n这次是额外放松练习，小恐龙也获得了经验值。'
                  : `${completeEncouragement.title}\n${completeEncouragement.english}`}
              </Text>

              {!completionReward.alreadyCompleted ? (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#F6FAF0',
                    borderRadius: 22,
                    padding: 16,
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#2B5036',
                    }}
                  >
                    Dino gained {completionReward.xp} XP.
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: '#5D7563',
                    }}
                  >
                    小恐龙获得了 {completionReward.xp} XP。
                  </Text>
                  {completionReward.leveledUp ? (
                    <Text
                      selectable
                      style={{
                        fontSize: 18,
                        fontWeight: '900',
                        color: '#2D7B35',
                        textAlign: 'center',
                      }}
                    >
                      Level Up!
                      {'\n'}
                      小恐龙升级啦！
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: '#78907A',
                  textAlign: 'center',
                }}
              >
                {completionReward.alreadyCompleted
                  ? 'Today completed 今天已完成'
                  : 'One gentle step today.'}
              </Text>

              <View style={{ width: '100%', gap: 10 }}>
                {recentHistory.length > 0 ? (
                  <PrimaryButton
                    label="View Mood History 查看情绪记录"
                    onPress={() => setCurrentStep('history')}
                    backgroundColor="#FFF2A6"
                    textColor="#5A4600"
                  />
                ) : null}
                <PrimaryButton label="Back Home 回到首页" onPress={goHome} />
                <PrimaryButton
                  label="Restart Demo 重新开始"
                  onPress={restartDemo}
                  backgroundColor="#DFF0FF"
                  textColor="#21405A"
                />
              </View>
            </View>
          ) : null}

          {currentStep === 'complete' ? (
            <ScalePressable
              onPress={() => {
                void resetProgress();
              }}
              style={{
                alignSelf: 'center',
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: '#F4F7EE',
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#70826F',
                }}
              >
                Reset Progress 重置进度
              </Text>
            </ScalePressable>
          ) : null}

          {currentStep !== 'complete' &&
          currentStep !== 'home' &&
          currentStep !== 'login' &&
          currentStep !== 'onboarding' &&
          currentStep !== 'preferences' ? (
            <ScalePressable
              onPress={restartDemo}
              style={{
                alignSelf: 'center',
                paddingTop: 6,
                paddingBottom: 2,
                paddingHorizontal: 16,
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#758A79',
                }}
              >
                重新开始 Demo
              </Text>
            </ScalePressable>
          ) : null}
        </Animated.View>
      </ScrollView>
      <HomeFeaturePanel
        activePanel={flowState.activeHomePanel}
        animation={homePanelTransition}
        characterUnlockRecords={characterUnlockRecords}
        characterUnlocks={characterUnlocks}
        currentLevel={currentLevel}
        currentLevelGoal={currentLevelGoal}
        levelProgressWidth={levelProgressWidth}
        onClose={closeHomePanel}
        onSelectCharacterItem={(itemId) => {
          void updateActiveCharacterItem(itemId);
        }}
        onSelectReminderTime={(time) => {
          void updateReminderTime(time);
        }}
        streak={streak}
        todayCompleted={todayCompleted}
        unlockedAchievementIds={unlockedAchievementIds}
        userPreferences={userPreferences}
        width={width}
        xp={xp}
        xpToNextLevel={xpToNextLevel}
      />
        </SafeAreaView>
      </FlowDispatchContext.Provider>
    </FlowStateContext.Provider>
  );
}
