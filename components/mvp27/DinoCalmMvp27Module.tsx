import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type PropsWithChildren,
} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import DailyReminder from '../daily-reminder';
import DeerRecoveryScene, { type RecoveryTraining } from '../deer-recovery-scene';
import DinoAvatar, { type DinoState } from '../dino-avatar';
import type {
  HistoryItem,
  MoodValue,
  RecoveryType,
  StressTime,
  TaskKind,
  UserPreferences,
} from '../recommendations';

type Mvp27Screen = 'home' | 'mood' | 'reminder' | 'level' | 'closet' | 'achievements' | 'recovery';
type BottomAction = Exclude<Mvp27Screen, 'home' | 'mood' | 'recovery'>;

type Mvp27State = {
  lastSelectedMood: MoodValue | null;
  reminderPreview: StressTime;
  screen: Mvp27Screen;
  selectedTraining: RecoveryTraining | null;
  userPreferences: UserPreferences;
};

type Mvp27Action =
  | { type: 'hydrate'; lastSelectedMood: MoodValue | null; userPreferences: UserPreferences }
  | { type: 'open'; screen: Mvp27Screen }
  | { type: 'selectMood'; mood: MoodValue }
  | { type: 'setReminderTime'; reminderTime: string }
  | { type: 'setTraining'; training: RecoveryTraining | null };

export type Mvp27CompleteTask = (
  task: TaskKind,
  recoveryType?: RecoveryType | null,
) => Promise<void> | void;

export type DinoCalmMvp27ModuleProps = {
  accessories?: string[];
  dinoState?: DinoState;
  level?: number;
  moodHistory?: HistoryItem[];
  onCompleteTask: Mvp27CompleteTask;
  todayCompleted?: boolean;
  userPreferences?: UserPreferences;
  xp: number;
  streak: number;
};

const STORAGE_KEYS = {
  lastSelectedMood: 'dino-calm-last-selected-mood',
  userPreferences: 'dino-calm-user-preferences',
};

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  favoriteReliefMethods: ['coffee', 'meditation', 'recovery'],
  reminderTime: '20:00',
  supportStyle: 'encouragement',
  stressTime: 'evening',
};

const moodOptions: Array<{ emoji: string; label: string; subtitle: string; value: MoodValue }> = [
  { emoji: '😊', label: 'Happy', subtitle: '开心', value: 'Happy' },
  { emoji: '😌', label: 'Calm', subtitle: '平静', value: 'Calm' },
  { emoji: '😰', label: 'Anxious', subtitle: '焦虑', value: 'Anxious' },
  { emoji: '😡', label: 'Angry', subtitle: '生气', value: 'Angry' },
  { emoji: '😴', label: 'Tired', subtitle: '疲惫', value: 'Tired' },
];

const recoveryTrainings: RecoveryTraining[] = [
  {
    key: 'neckShoulder',
    title: 'Neck and Shoulder Reset',
    chineseTitle: '肩颈放松',
    description: 'Tiny movements for a tight upper body.',
    steps: [
      { english: 'Drop your shoulders.', chinese: '肩膀轻轻放下来。' },
      { english: 'Look slowly left and right.', chinese: '慢慢看向左边和右边。' },
      { english: 'Circle your shoulders twice.', chinese: '肩膀轻轻绕两圈。' },
    ],
  },
  {
    key: 'wristHand',
    title: 'Wrist and Hand Ease',
    chineseTitle: '手腕放松',
    description: 'A short break for typing hands.',
    steps: [
      { english: 'Open and close your hands.', chinese: '手掌张开，再轻轻握住。' },
      { english: 'Draw small wrist circles.', chinese: '手腕画小圈。' },
      { english: 'Shake your fingers softly.', chinese: '手指轻轻抖一抖。' },
    ],
  },
  {
    key: 'backStretch',
    title: 'Back Stretch',
    chineseTitle: '背部伸展',
    description: 'Make a little more room for breathing.',
    steps: [
      { english: 'Sit tall for one breath.', chinese: '坐直，呼吸一次。' },
      { english: 'Round your back gently.', chinese: '背部轻轻拱起来。' },
      { english: 'Return to a soft tall seat.', chinese: '慢慢回到舒服坐姿。' },
    ],
  },
];

const Mvp27StateContext = createContext<Mvp27State | null>(null);
const Mvp27DispatchContext = createContext<React.Dispatch<Mvp27Action> | null>(null);

const getReminderMoment = (time?: string): StressTime => {
  const hour = Number((time ?? '20:00').split(':')[0]);

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

const getDateFromReminderTime = (time?: string) => {
  const [rawHour, rawMinute] = (time ?? '20:00').split(':');
  const date = new Date();
  date.setHours(Number(rawHour) || 20, Number(rawMinute) || 0, 0, 0);
  return date;
};

const getReminderTimeFromDate = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const reducer = (state: Mvp27State, action: Mvp27Action): Mvp27State => {
  if (action.type === 'hydrate') {
    return {
      ...state,
      lastSelectedMood: action.lastSelectedMood,
      reminderPreview: getReminderMoment(action.userPreferences.reminderTime),
      userPreferences: action.userPreferences,
    };
  }

  if (action.type === 'open') {
    return { ...state, screen: action.screen };
  }

  if (action.type === 'selectMood') {
    return { ...state, lastSelectedMood: action.mood, screen: 'home' };
  }

  if (action.type === 'setReminderTime') {
    return {
      ...state,
      reminderPreview: getReminderMoment(action.reminderTime),
      userPreferences: { ...state.userPreferences, reminderTime: action.reminderTime },
    };
  }

  if (action.type === 'setTraining') {
    return { ...state, selectedTraining: action.training };
  }

  return state;
};

const useMvp27State = () => {
  const value = useContext(Mvp27StateContext);

  if (!value) {
    throw new Error('useMvp27State must be used inside DinoCalmMvp27Provider');
  }

  return value;
};

const useMvp27Dispatch = () => {
  const value = useContext(Mvp27DispatchContext);

  if (!value) {
    throw new Error('useMvp27Dispatch must be used inside DinoCalmMvp27Provider');
  }

  return value;
};

function DinoCalmMvp27Provider({
  children,
  initialPreferences = DEFAULT_USER_PREFERENCES,
}: PropsWithChildren<{ initialPreferences?: UserPreferences }>) {
  const [state, dispatch] = useReducer(reducer, {
    lastSelectedMood: null,
    reminderPreview: getReminderMoment(initialPreferences.reminderTime),
    screen: 'home',
    selectedTraining: recoveryTrainings[0],
    userPreferences: initialPreferences,
  });

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const [[, storedPreferences], [, storedMood]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.userPreferences,
        STORAGE_KEYS.lastSelectedMood,
      ]);
      const parsedPreferences = storedPreferences
        ? ({ ...DEFAULT_USER_PREFERENCES, ...JSON.parse(storedPreferences) } as UserPreferences)
        : initialPreferences;

      if (mounted) {
        dispatch({
          type: 'hydrate',
          lastSelectedMood: (storedMood as MoodValue | null) ?? null,
          userPreferences: parsedPreferences,
        });
      }
    };

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [initialPreferences]);

  return (
    <Mvp27StateContext.Provider value={state}>
      <Mvp27DispatchContext.Provider value={dispatch}>{children}</Mvp27DispatchContext.Provider>
    </Mvp27StateContext.Provider>
  );
}

function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  return {
    animatedStyle: { transform: [{ scale }] },
    pressIn: () => Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 26 }).start(),
    pressOut: () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 26 }).start(),
  };
}

function BottomButton({
  action,
  icon,
  label,
}: {
  action: BottomAction;
  icon: string;
  label: string;
}) {
  const dispatch = useMvp27Dispatch();
  const { animatedStyle, pressIn, pressOut } = usePressAnimation();

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={() => dispatch({ type: 'open', screen: action })}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={styles.bottomPressable}
    >
      <Animated.View style={[styles.bottomButton, animatedStyle]}>
        <Text style={styles.bottomIcon}>{icon}</Text>
      </Animated.View>
    </Pressable>
  );
}

function SlideCard({ children }: PropsWithChildren) {
  const slide = useRef(new Animated.Value(18)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slide.setValue(18);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  return (
    <Animated.View style={[styles.contentCard, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {children}
    </Animated.View>
  );
}

function HomeScreen({
  accessories,
  dinoState = 'calm',
  level = 1,
  streak,
  xp,
}: {
  accessories?: string[];
  dinoState?: DinoState;
  level?: number;
  streak: number;
  xp: number;
}) {
  const dispatch = useMvp27Dispatch();
  const state = useMvp27State();
  const { animatedStyle, pressIn, pressOut } = usePressAnimation();

  return (
    <SlideCard>
      <View style={styles.homeHeader}>
        <Text style={styles.kicker}>Dino Calm / 小恐龙松一口气</Text>
        <Text style={styles.title}>Level {level}</Text>
      </View>

      <Pressable
        accessibilityLabel="Open mood selection"
        onPress={() => dispatch({ type: 'open', screen: 'mood' })}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.dinoButton}
      >
        <Animated.View style={animatedStyle}>
          <DinoAvatar accessories={accessories} state={dinoState} size={210} />
        </Animated.View>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{xp}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <Pressable style={styles.recoveryBanner} onPress={() => dispatch({ type: 'open', screen: 'recovery' })}>
        <Text style={styles.bannerTitle}>Deer Recovery Training</Text>
        <Text style={styles.bannerCopy}>Swipe into a soft body reset with Deer. 向左滑也可以进入小鹿康复训练。</Text>
      </Pressable>

      {state.lastSelectedMood ? (
        <Text style={styles.footerHint}>Last mood: {state.lastSelectedMood}</Text>
      ) : (
        <Text style={styles.footerHint}>Tap Dino to choose today&apos;s mood.</Text>
      )}
    </SlideCard>
  );
}

function MoodSelectionScreen() {
  const dispatch = useMvp27Dispatch();

  const selectMood = async (mood: MoodValue) => {
    dispatch({ type: 'selectMood', mood });
    await AsyncStorage.setItem(STORAGE_KEYS.lastSelectedMood, mood);
  };

  return (
    <SlideCard>
      <Text style={styles.kicker}>Mood check / 心情选择</Text>
      <Text style={styles.title}>How are you arriving?</Text>
      <View style={styles.moodGrid}>
        {moodOptions.map((mood, index) => (
          <AnimatedMoodButton key={mood.value} index={index} mood={mood} onPress={() => void selectMood(mood.value)} />
        ))}
      </View>
    </SlideCard>
  );
}

function AnimatedMoodButton({
  index,
  mood,
  onPress,
}: {
  index: number;
  mood: (typeof moodOptions)[number];
  onPress: () => void;
}) {
  const float = useRef(new Animated.Value(0)).current;
  const { animatedStyle, pressIn, pressOut } = usePressAnimation();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400 + index * 110,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400 + index * 110,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [float, index]);

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={styles.moodPressable}>
      <Animated.View
        style={[
          styles.moodCard,
          animatedStyle,
          {
            transform: [
              ...(Array.isArray(animatedStyle.transform) ? animatedStyle.transform : []),
              {
                translateY: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -5],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
        <Text style={styles.moodLabel}>{mood.label}</Text>
        <Text style={styles.moodSubtitle}>{mood.subtitle}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ReminderMomentAnimation() {
  const { reminderPreview } = useMvp27State();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse, reminderPreview]);

  const copy = {
    morning: { emoji: '☀️', title: 'Morning sunshine', color: '#FFE08A' },
    afternoon: { emoji: '🌿', title: 'Noon pause', color: '#BDEB95' },
    evening: { emoji: '🌇', title: 'Evening glow', color: '#FFB88A' },
    'before-sleep': { emoji: '🌙', title: 'Moonlight wind-down', color: '#AFC8FF' },
  }[reminderPreview];

  return (
    <View style={[styles.momentScene, { backgroundColor: copy.color }]}>
      <Animated.Text
        style={[
          styles.momentEmoji,
          {
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.08],
                }),
              },
            ],
          },
        ]}
      >
        {copy.emoji}
      </Animated.Text>
      <Text style={styles.momentTitle}>{copy.title}</Text>
    </View>
  );
}

function GentleReminderScreen() {
  const dispatch = useMvp27Dispatch();
  const { userPreferences } = useMvp27State();
  const selectedDate = useMemo(
    () => getDateFromReminderTime(userPreferences.reminderTime),
    [userPreferences.reminderTime],
  );
  const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const updateReminderTime = async (time: string) => {
    const nextPreferences = { ...userPreferences, reminderTime: time };
    dispatch({ type: 'setReminderTime', reminderTime: time });
    await AsyncStorage.setItem(STORAGE_KEYS.userPreferences, JSON.stringify(nextPreferences));
  };

  const onNativeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      void updateReminderTime(getReminderTimeFromDate(date));
    }
  };

  return (
    <SlideCard>
      <Text style={styles.kicker}>Gentle Reminder</Text>
      <Text style={styles.title}>Choose a soft check-in time</Text>
      <ReminderMomentAnimation />
      <Text style={styles.timeCopy}>Current reminder: {userPreferences.reminderTime ?? '20:00'}</Text>

      {Platform.OS !== 'web' ? (
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          mode="time"
          onChange={onNativeChange}
          themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
          value={selectedDate}
        />
      ) : (
        <View style={styles.webPicker}>
          <ScrollView style={styles.pickerColumn}>
            {hours.map((hour) => (
              <Pressable key={hour} onPress={() => void updateReminderTime(`${hour}:${(userPreferences.reminderTime ?? '20:00').slice(3)}`)}>
                <Text style={styles.pickerOption}>{hour}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView style={styles.pickerColumn}>
            {minutes.map((minute) => (
              <Pressable key={minute} onPress={() => void updateReminderTime(`${(userPreferences.reminderTime ?? '20:00').slice(0, 2)}:${minute}`)}>
                <Text style={styles.pickerOption}>{minute}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </SlideCard>
  );
}

function SimplePanel({ title, body }: { title: string; body: string }) {
  const dispatch = useMvp27Dispatch();

  return (
    <SlideCard>
      <Text style={styles.kicker}>MVP 2.7</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.panelBody}>{body}</Text>
      <Pressable style={styles.primaryButton} onPress={() => dispatch({ type: 'open', screen: 'home' })}>
        <Text style={styles.primaryButtonText}>Back Home</Text>
      </Pressable>
    </SlideCard>
  );
}

function RecoveryScreen({ onCompleteTask }: { onCompleteTask: Mvp27CompleteTask }) {
  const dispatch = useMvp27Dispatch();
  const { selectedTraining } = useMvp27State();
  const [started, setStarted] = useReducer(() => true, false);
  const [paused, togglePaused] = useReducer((value) => !value, false);
  const [completed, setCompleted] = useReducer(() => true, false);
  const [stepIndex, setStepIndex] = useReducer(
    (index: number, next?: number) =>
      selectedTraining ? Math.min(next ?? index + 1, selectedTraining.steps.length - 1) : 0,
    0,
  );

  return (
    <SlideCard>
      <DeerRecoveryScene
        currentStep={selectedTraining?.steps[stepIndex] ?? null}
        formattedSeconds="01:00"
        isCompact={false}
        onChooseAnother={() => dispatch({ type: 'setTraining', training: null })}
        onComplete={() => {
          setCompleted();
          void onCompleteTask('recovery', selectedTraining?.key ?? null);
        }}
        onNextStep={() => setStepIndex()}
        onPause={togglePaused}
        onSelectTraining={(training) => {
          dispatch({ type: 'setTraining', training });
          setStepIndex(0);
        }}
        onStart={setStarted}
        recoveryCompleted={completed}
        recoveryPaused={paused}
        recoveryStarted={started}
        selectedTraining={selectedTraining}
        stepIndex={stepIndex}
        trainings={recoveryTrainings}
      />
    </SlideCard>
  );
}

function ReminderScheduler({
  moodHistory,
  todayCompleted,
}: {
  moodHistory: HistoryItem[];
  todayCompleted: boolean;
}) {
  const { userPreferences } = useMvp27State();

  return (
    <DailyReminder
      moodHistory={moodHistory}
      todayCompleted={todayCompleted}
      userPreferences={userPreferences}
    />
  );
}

function ModuleBody({
  accessories,
  dinoState,
  level,
  onCompleteTask,
  streak,
  xp,
}: Required<Pick<DinoCalmMvp27ModuleProps, 'onCompleteTask' | 'streak' | 'xp'>> &
  Pick<DinoCalmMvp27ModuleProps, 'accessories' | 'dinoState' | 'level'>) {
  const state = useMvp27State();
  const dispatch = useMvp27Dispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panX = useRef(new Animated.Value(0)).current;
  const isCompact = width < 390;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        state.screen === 'home' && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        panX.setValue(Math.max(-44, Math.min(12, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        Animated.spring(panX, { toValue: 0, useNativeDriver: true, speed: 24 }).start();

        if (gesture.dx < -54) {
          dispatch({ type: 'open', screen: 'recovery' });
        }
      },
    }),
  ).current;

  const content = {
    achievements: <SimplePanel title="Achievements" body="Unlocks stay mapped to the existing XP, streak, and character rules." />,
    closet: <SimplePanel title="Character Closet" body="Use the existing Character Unlock module for accessory ownership and active looks." />,
    home: <HomeScreen accessories={accessories} dinoState={dinoState} level={level} streak={streak} xp={xp} />,
    level: <SimplePanel title={`Level ${level ?? 1}`} body={`${xp} XP earned. Keep rewards flowing through completeTask().`} />,
    mood: <MoodSelectionScreen />,
    recovery: <RecoveryScreen onCompleteTask={onCompleteTask} />,
    reminder: <GentleReminderScreen />,
  }[state.screen];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.shell, { paddingTop: Math.max(insets.top, 14) }]}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.contentWrap,
            isCompact ? styles.contentWrapCompact : null,
            { transform: [{ translateX: panX }] },
          ]}
        >
          {content}
        </Animated.View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <BottomButton action="level" icon="⭐" label="Level Progress" />
          <BottomButton action="closet" icon="🎒" label="Character Closet" />
          <BottomButton action="reminder" icon="⏰" label="Gentle Reminder" />
          <BottomButton action="achievements" icon="🏆" label="Achievements" />
        </View>

        {state.screen !== 'home' ? (
          <Pressable style={styles.closeButton} onPress={() => dispatch({ type: 'open', screen: 'home' })}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function DinoCalmMvp27Module({
  accessories,
  dinoState = 'calm',
  level = 1,
  moodHistory = [],
  onCompleteTask,
  streak,
  todayCompleted = false,
  userPreferences = DEFAULT_USER_PREFERENCES,
  xp,
}: DinoCalmMvp27ModuleProps) {
  return (
    <SafeAreaProvider>
      <DinoCalmMvp27Provider initialPreferences={userPreferences}>
        <ReminderScheduler moodHistory={moodHistory} todayCompleted={todayCompleted} />
        <ModuleBody
          accessories={accessories}
          dinoState={dinoState}
          level={level}
          onCompleteTask={onCompleteTask}
          streak={streak}
          xp={xp}
        />
      </DinoCalmMvp27Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3E8',
  },
  shell: {
    flex: 1,
    paddingHorizontal: 18,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 96,
  },
  contentWrapCompact: {
    paddingBottom: 84,
  },
  contentCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFDF7',
    borderColor: '#E7D9B6',
    borderRadius: 28,
    borderWidth: 2,
    maxWidth: 520,
    padding: 20,
    width: '100%',
  },
  homeHeader: {
    alignItems: 'center',
    gap: 4,
  },
  kicker: {
    color: '#6E7C5C',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#2F3C2C',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  dinoButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 10,
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    borderColor: '#BDEB95',
    borderRadius: 22,
    borderWidth: 2,
    minWidth: 108,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  statValue: {
    color: '#3F6B34',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#66765F',
    fontSize: 12,
    fontWeight: '800',
  },
  recoveryBanner: {
    backgroundColor: '#E8F4F2',
    borderColor: '#BEDBD6',
    borderRadius: 20,
    borderWidth: 2,
    marginTop: 18,
    padding: 16,
  },
  bannerTitle: {
    color: '#315B56',
    fontSize: 17,
    fontWeight: '900',
  },
  bannerCopy: {
    color: '#55736F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },
  footerHint: {
    color: '#7F7A69',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  moodPressable: {
    width: '47%',
  },
  moodCard: {
    alignItems: 'center',
    backgroundColor: '#F7FAEF',
    borderColor: '#D9EBC5',
    borderRadius: 22,
    borderWidth: 2,
    minHeight: 120,
    justifyContent: 'center',
    padding: 12,
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodLabel: {
    color: '#33452F',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  moodSubtitle: {
    color: '#697A60',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  momentScene: {
    alignItems: 'center',
    borderRadius: 24,
    minHeight: 150,
    justifyContent: 'center',
    marginTop: 18,
    overflow: 'hidden',
  },
  momentEmoji: {
    fontSize: 46,
  },
  momentTitle: {
    color: '#31402F',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  timeCopy: {
    color: '#5F6B55',
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 14,
    textAlign: 'center',
  },
  webPicker: {
    flexDirection: 'row',
    gap: 10,
    maxHeight: 160,
  },
  pickerColumn: {
    backgroundColor: '#F8F4EA',
    borderRadius: 18,
    flex: 1,
  },
  pickerOption: {
    color: '#33452F',
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 12,
    textAlign: 'center',
  },
  panelBody: {
    color: '#566451',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#58CC02',
    borderBottomColor: '#43A600',
    borderBottomWidth: 5,
    borderRadius: 22,
    marginTop: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  bottomBar: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    position: 'absolute',
    right: 0,
  },
  bottomPressable: {
    flex: 1,
    maxWidth: 72,
  },
  bottomButton: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#DAD2BB',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    shadowColor: '#786B4D',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  bottomIcon: {
    fontSize: 23,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0D5BE',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 18,
    width: 36,
  },
  closeButtonText: {
    color: '#67705E',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
});

export default DinoCalmMvp27Module;
