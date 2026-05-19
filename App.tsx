import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DinoAvatar, type DinoState } from './components/dino-avatar';

type Step =
  | 'onboarding'
  | 'home'
  | 'mood'
  | 'state'
  | 'breathing'
  | 'bubbles'
  | 'complete'
  | 'history'
  | 'about';
type MoodValue = 'Happy' | 'Calm' | 'Tired' | 'Anxious' | 'Angry' | 'Sad';
type TaskKind = 'breathing' | 'bubbles' | 'mood-check';
type HistoryItem = {
  date: string;
  mood: MoodValue;
  task: TaskKind;
  completedAt: number;
};
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

const moodOptions: MoodOption[] = [
  { emoji: '😊', label: 'Happy', subLabel: '开心', value: 'Happy', tone: 'positive' },
  { emoji: '😌', label: 'Calm', subLabel: '平静', value: 'Calm', tone: 'positive' },
  { emoji: '😴', label: 'Tired', subLabel: '疲惫', value: 'Tired', tone: 'heavy' },
  { emoji: '😰', label: 'Anxious', subLabel: '焦虑', value: 'Anxious', tone: 'heavy' },
  { emoji: '😡', label: 'Angry', subLabel: '生气', value: 'Angry', tone: 'heavy' },
  { emoji: '😢', label: 'Sad', subLabel: '难过', value: 'Sad', tone: 'heavy' },
];

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
};

const RECOMMENDED_TASK_BY_MOOD: Partial<Record<MoodValue, TaskKind>> = {
  Tired: 'breathing',
  Anxious: 'breathing',
  Angry: 'bubbles',
  Sad: 'breathing',
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

const STORAGE_KEYS = {
  hasSeenOnboarding: 'dino-calm-has-seen-onboarding',
  xp: 'dino-calm-xp',
  streak: 'dino-calm-streak',
  lastCompletedDate: 'dino-calm-last-completed-date',
  moodHistory: 'dino-calm-mood-history',
};

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
  const [completedTask, setCompletedTask] = useState<TaskKind | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    const loadProgress = async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          STORAGE_KEYS.hasSeenOnboarding,
          STORAGE_KEYS.xp,
          STORAGE_KEYS.streak,
          STORAGE_KEYS.lastCompletedDate,
          STORAGE_KEYS.moodHistory,
        ]);
        const savedHasSeenOnboarding = entries[0]?.[1] === 'true';
        const savedXp = Number(entries[1]?.[1] ?? '0');
        const savedStreak = Number(entries[2]?.[1] ?? '0');
        const savedLastCompletedDate = entries[3]?.[1] ?? null;
        const savedMoodHistory = entries[4]?.[1];
        const isStillToday =
          savedLastCompletedDate !== null && savedLastCompletedDate === getTodayDateString();

        if (!isMounted) {
          return;
        }

        setCurrentStep(savedHasSeenOnboarding ? 'home' : 'onboarding');
        setXp(Number.isFinite(savedXp) ? savedXp : 0);
        setStreak(Number.isFinite(savedStreak) ? savedStreak : 0);
        setLastCompletedDate(savedLastCompletedDate);
        setTodayCompleted(isStillToday);
        setMoodHistory(savedMoodHistory ? (JSON.parse(savedMoodHistory) as HistoryItem[]) : []);
      } catch {
        if (!isMounted) {
          return;
        }

        setCurrentStep('onboarding');
        setXp(0);
        setStreak(0);
        setLastCompletedDate(null);
        setTodayCompleted(false);
        setMoodHistory([]);
      }
    };

    void loadProgress();

    return () => {
      isMounted = false;
    };
  }, []);

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
          completeTask();
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

  const restartDemo = () => {
    setCurrentStep('home');
    setSelectedMood(null);
    setDinoState('calm');
    setPoppedBubbles([]);
    setReliefProgress(0);
    resetBubbleAnimations();
    resetBreathing();
  };

  const goHome = () => {
    setCurrentStep('home');
    setSelectedMood(null);
    setDinoState('calm');
    setPoppedBubbles([]);
    setReliefProgress(0);
    resetBubbleAnimations();
    resetBreathing();
  };

  const resetProgress = async () => {
    setXp(0);
    setStreak(0);
    setTodayCompleted(false);
    setLastCompletedDate(null);
    setMoodHistory([]);

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.xp,
        STORAGE_KEYS.streak,
        STORAGE_KEYS.lastCompletedDate,
        STORAGE_KEYS.moodHistory,
      ]);
    } catch {
      // Ignore reset failures during demo use.
    }
  };

  const handleSelectMood = (mood: MoodOption) => {
    setSelectedMood(mood.value);
    setCurrentStep('state');
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

  const completeTask = () => {
    resetBreathing();
    setDinoState('happy');
    setReliefProgress(100);
    const previousLevel = getDinoLevel(xp);
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
    const rewardTask = completedTask ?? 'mood-check';
    const newLevel = getDinoLevel(nextXp);

    setXp(nextXp);
    setStreak(nextStreak);
    setCompletionReward({
      xp: xpGain,
      alreadyCompleted: !isFirstCompletionToday,
      leveledUp: newLevel > previousLevel,
    });
    setCompleteEncouragement(
      ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)],
    );
    setTodayCompleted(true);
    setLastCompletedDate(today);
    setCurrentStep('complete');

    const nextHistory = isFirstCompletionToday && selectedMood
      ? [
          {
            date: today,
            mood: selectedMood,
            task: rewardTask,
            completedAt: Date.now(),
          },
          ...moodHistory.filter((item) => item.date !== today),
        ].sort((a, b) => b.completedAt - a.completedAt)
      : moodHistory;

    if (isFirstCompletionToday && selectedMood) {
      setMoodHistory(nextHistory);
    }

    void AsyncStorage.multiSet([
      [STORAGE_KEYS.xp, String(nextXp)],
      [STORAGE_KEYS.streak, String(nextStreak)],
      [STORAGE_KEYS.lastCompletedDate, today],
      [STORAGE_KEYS.moodHistory, JSON.stringify(nextHistory)],
    ]);
  };

  const startTask = (task: TaskKind) => {
    setCurrentStep(task === 'breathing' ? 'breathing' : 'bubbles');
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
          completeTask();
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
  const streakLabel = getStreakLabel(streak);
  const isPositiveMood = selectedMoodData?.tone === 'positive';
  const selectedMoodContent = selectedMood ? MOOD_CONTENT[selectedMood] : null;
  const recommendedTask = selectedMood ? RECOMMENDED_TASK_BY_MOOD[selectedMood] : null;
  const alternativeTask =
    recommendedTask === 'breathing' ? 'bubbles' : recommendedTask === 'bubbles' ? 'breathing' : null;
  const currentBreathingPhase = BREATHING_PHASES[breathingPhaseIndex];
  const isTaskStep = currentStep === 'breathing' || currentStep === 'bubbles';
  const isInfoStep = currentStep === 'history' || currentStep === 'about';
  const shouldShowStats = currentStep !== 'onboarding';
  const dinoSize =
    currentStep === 'home'
      ? isCompact
        ? 192
        : 214
      : currentStep === 'onboarding'
        ? isCompact
          ? 162
          : 178
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
  const cardPadding = currentStep === 'complete' ? 20 : 22;
  const recentHistory = moodHistory.slice(0, 7);
  const heroContent: HeroContent =
    currentStep === 'home'
      ? {
          eyebrow: todayCompleted ? 'Already cared for today' : 'A tiny check-in is enough',
          title: 'How are you feeling today?',
          subtitle: '今天，让小恐龙陪你松一口气。',
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#EEF8DD' }}
      edges={['top', 'left', 'right', 'bottom']}
    >
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

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 32,
            padding: cardPadding,
            gap: currentStep === 'complete' ? 14 : 18,
            boxShadow: CARD_SHADOW,
          }}
        >
          <View style={{ alignItems: 'center', gap: heroGap }}>
            <Animated.View
              style={{
                minHeight:
                  currentStep === 'home'
                    ? dinoSize * 1.12
                    : isTaskStep
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
                accessories={currentStep === 'home' ? unlockedAccessories.map((item) => item.label) : []}
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

          {currentStep === 'home' ? (
            <View
              style={{
                backgroundColor: '#F8FBF3',
                borderRadius: 24,
                padding: 16,
                gap: 10,
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 16,
                  fontWeight: '900',
                  color: '#20422C',
                }}
              >
                Dino Level {currentLevel.level} · 小恐龙等级 {currentLevel.level}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 17,
                  fontWeight: '800',
                  color: '#2D5038',
                }}
              >
                {currentLevel.chineseTitle} {currentLevel.title}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  color: '#6B7F6D',
                }}
              >
                {currentLevel.description}
              </Text>

              <View style={{ gap: 8 }}>
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
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#2D5038',
                    }}
                  >
                    {currentLevel.nextLevel === null ? 'Max Level' : `Level ${currentLevel.level} Progress`}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#5E785F',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {currentLevel.nextLevel === null ? '守护恐龙' : `${xp} / ${currentLevelGoal} XP`}
                  </Text>
                </View>
                <View
                  style={{
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: '#CFE9B9',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${currentLevelProgress * 100}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: '#3FAE4E',
                    }}
                  />
                </View>
              </View>

              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: '#6F836F',
                }}
              >
                {currentLevel.nextLevel === null
                  ? 'Max Level\n小恐龙已经成长为守护恐龙啦。'
                  : `${xpToNextLevel} XP to Level ${currentLevel.nextLevel}\n距离下一级还差 ${xpToNextLevel} XP`}
              </Text>

              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: 14,
                  gap: 8,
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#2A4A35',
                  }}
                >
                  Unlocked:
                </Text>
                {unlockedAccessories.length > 0 ? (
                  <Text
                    selectable
                    style={{
                      fontSize: 16,
                      lineHeight: 24,
                      color: '#58725F',
                    }}
                  >
                    {unlockedAccessories.map((item) => `${item.emoji} ${item.label}`).join('  ')}
                  </Text>
                ) : (
                  <Text
                    selectable
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: '#738674',
                    }}
                  >
                    Keep coming back gently to unlock accessories.
                    {'\n'}
                    慢慢回来，就能给小恐龙解锁小装饰。
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {currentStep === 'home' ? (
            <View style={{ gap: 14 }}>
              <Text
                selectable
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: '#68806E',
                  textAlign: 'center',
                }}
              >
                {todayCompleted
                  ? 'Today completed. You can still relax again and earn a little XP.'
                  : 'Start with one tiny check-in. No pressure, just one gentle step.'}
              </Text>
              <Text
                selectable
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: '#7A8D79',
                  textAlign: 'center',
                }}
              >
                {todayCompleted
                  ? '今天已经完成啦，但你仍然可以继续放松，并获得一点经验值。'
                  : 'Coming back counts. 回来就算赢。'}
              </Text>
              <PrimaryButton
                label={todayCompleted ? 'Relax Again 再放松一次' : '开始情绪检查'}
                onPress={() => {
                  setCurrentStep('mood');
                  setDinoState('calm');
                }}
              />
              {todayCompleted ? (
                <PrimaryButton
                  label="View Mood History 查看情绪记录"
                  onPress={() => setCurrentStep('history')}
                  backgroundColor="#FFF2A6"
                  textColor="#5A4600"
                />
              ) : null}
              <PrimaryButton
                label="About 关于"
                onPress={() => setCurrentStep('about')}
                backgroundColor="#F0F7E8"
                textColor="#35503A"
              />
            </View>
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
                    {formatHistoryDate(entry.date)}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: '#25422E',
                    }}
                  >
                    {moodEmojiMap[entry.mood]}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 15,
                      color: '#486054',
                    }}
                  >
                    {entry.task === 'breathing'
                      ? TASK_CONTENT.breathing.title
                      : entry.task === 'bubbles'
                      ? TASK_CONTENT.bubbles.title
                        : 'Mood Check 情绪记录'}
                  </Text>
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
                    setCurrentStep('home');
                    return;
                  }

                  setOnboardingPage((page) => page + 1);
                }}
              />
            </View>
          ) : null}

          {currentStep === 'mood' ? (
            <View style={{ gap: 10 }}>
              {moodOptions.map((mood) => (
                <ScalePressable
                  key={mood.value}
                  onPress={() => handleSelectMood(mood)}
                  style={{
                    backgroundColor: mood.tone === 'positive' ? '#F6FFF0' : '#FFF7F0',
                    borderRadius: 22,
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    borderWidth: 2,
                    borderColor: mood.tone === 'positive' ? '#CDEFAF' : '#FFD8C8',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text selectable style={{ fontSize: 18 }}>
                    {mood.emoji}
                  </Text>
                  <Text
                    selectable
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#274230',
                      lineHeight: 22,
                    }}
                  >
                    {mood.label} {mood.subLabel}
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: '#7A907C',
                      fontWeight: '700',
                    }}
                  >
                    Pick
                  </Text>
                </ScalePressable>
              ))}
            </View>
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
                      completeTask();
                    }}
                  />
                </>
              ) : (
                <View style={{ gap: 12 }}>
                  {recommendedTask ? (
                    <ScalePressable
                      onPress={() => startTask(recommendedTask)}
                      style={{
                        backgroundColor: recommendedTask === 'breathing' ? '#DDF3FF' : '#FFE9F2',
                        borderRadius: 24,
                        padding: 18,
                        gap: 8,
                        borderWidth: 2,
                        borderColor: recommendedTask === 'breathing' ? '#A7DDF7' : '#F4BED8',
                        boxShadow:
                          recommendedTask === 'breathing'
                            ? '0 10px 18px rgba(90, 146, 186, 0.12)'
                            : '0 10px 18px rgba(184, 107, 140, 0.12)',
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: '#647866',
                        }}
                      >
                        Recommended for you 推荐给你
                      </Text>
                      <Text
                        selectable
                        style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: TASK_CONTENT[recommendedTask].textColor,
                        }}
                      >
                        {TASK_CONTENT[recommendedTask].title}
                      </Text>
                      <Text
                        selectable
                        style={{
                          fontSize: 15,
                          lineHeight: 22,
                          color: recommendedTask === 'breathing' ? '#5D7481' : '#8D6377',
                        }}
                      >
                        {TASK_CONTENT[recommendedTask].description}
                      </Text>
                    </ScalePressable>
                  ) : null}

                  {alternativeTask ? (
                    <ScalePressable
                      onPress={() => startTask(alternativeTask)}
                      style={{
                        backgroundColor: TASK_CONTENT[alternativeTask].color,
                        borderRadius: 24,
                        padding: 18,
                        gap: 8,
                        boxShadow:
                          alternativeTask === 'breathing'
                            ? '0 10px 18px rgba(90, 146, 186, 0.12)'
                            : '0 10px 18px rgba(184, 107, 140, 0.12)',
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: '#758A79',
                        }}
                      >
                        Another gentle option 另一个选择
                      </Text>
                      <Text
                        selectable
                        style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: TASK_CONTENT[alternativeTask].textColor,
                        }}
                      >
                        {TASK_CONTENT[alternativeTask].title}
                      </Text>
                      <Text
                        selectable
                        style={{
                          fontSize: 15,
                          lineHeight: 22,
                          color: alternativeTask === 'breathing' ? '#5D7481' : '#8D6377',
                        }}
                      >
                        {TASK_CONTENT[alternativeTask].description}
                      </Text>
                    </ScalePressable>
                  ) : null}
                </View>
              )}
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
                  onPress={completeTask}
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

          {currentStep === 'complete' ? (
            <View style={{ gap: 12, alignItems: 'center' }}>
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

          {(currentStep === 'home' || currentStep === 'complete') ? (
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

          {currentStep !== 'complete' && currentStep !== 'home' ? (
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
