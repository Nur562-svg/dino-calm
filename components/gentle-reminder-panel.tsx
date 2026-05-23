import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import type { StressTime, UserPreferences } from './recommendations';

type ReminderTimeOption = {
  emoji: string;
  label: string;
  subLabel: string;
  value: string;
};

type GentleReminderPanelProps = {
  onSelectReminderTime: (time: string) => void;
  reminderTimeOptions: ReminderTimeOption[];
  todayCompleted: boolean;
  userPreferences: UserPreferences;
};

const getDateFromReminderTime = (reminderTime?: string) => {
  const [rawHour, rawMinute] = (reminderTime ?? '20:00').split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const date = new Date();
  date.setHours(
    Number.isInteger(hour) ? hour : 20,
    Number.isInteger(minute) ? minute : 0,
    0,
    0,
  );

  return date;
};

const getReminderTimeFromDate = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const getReminderMoment = (reminderTime?: string): StressTime => {
  const hour = getDateFromReminderTime(reminderTime).getHours();

  if (hour >= 5 && hour < 11) {
    return 'morning';
  }

  if (hour >= 11 && hour < 17) {
    return 'afternoon';
  }

  if (hour >= 17 && hour < 21) {
    return 'evening';
  }

  return 'before-sleep';
};

function ReminderMomentAnimation({ reminderTime }: { reminderTime?: string }) {
  const float = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const moment = getReminderMoment(reminderTime);
  const isMorning = moment === 'morning';
  const isAfternoon = moment === 'afternoon';
  const isEvening = moment === 'evening';
  const title = isMorning
    ? 'Morning sunshine'
    : isAfternoon
      ? 'Noon pause'
      : isEvening
        ? 'Evening glow'
        : 'Moonlight wind-down';
  const subtitle = isMorning
    ? '阳光慢慢升起，小恐龙轻轻叫醒你。'
    : isAfternoon
      ? '中午放慢一点，给自己一小段午休。'
      : isEvening
        ? '夜色变柔和，小恐龙提醒你慢慢松一口气。'
        : '月光安静下来，适合准备睡前放松。';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(float, {
            toValue: 1,
            duration: 1700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(float, {
            toValue: 0,
            duration: 1700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [float, glow, moment]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const scale = float.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const haloOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.26, 0.52],
  });
  const skyColor = isMorning
    ? '#FFF3BC'
    : isAfternoon
      ? '#DFF4FF'
      : isEvening
        ? '#F0E6FF'
        : '#E7E9FF';
  const orbColor = isMorning
    ? '#FFD45A'
    : isAfternoon
      ? '#FFFFFF'
      : isEvening
        ? '#FFB86B'
        : '#FDF7C7';
  const accentColor = isMorning
    ? '#FF9F43'
    : isAfternoon
      ? '#8FCBD8'
      : isEvening
        ? '#A58AE8'
        : '#8F9BFF';

  return (
    <View
      style={{
        backgroundColor: skyColor,
        borderColor: '#FFFFFF',
        borderRadius: 28,
        borderWidth: 2,
        height: 178,
        overflow: 'hidden',
        padding: 18,
      }}
    >
      <Animated.View
        style={{
          backgroundColor: orbColor,
          borderRadius: 999,
          height: 82,
          opacity: haloOpacity,
          position: 'absolute',
          right: 22,
          top: 22,
          width: 82,
          transform: [{ scale }],
        }}
      />
      <Animated.View
        style={{
          alignItems: 'center',
          backgroundColor: orbColor,
          borderRadius: 999,
          height: 54,
          justifyContent: 'center',
          position: 'absolute',
          right: 36,
          top: 36,
          width: 54,
          transform: [{ translateY }, { scale }],
        }}
      >
        <Text selectable style={{ color: '#5C5E39', fontSize: 24, fontWeight: '900' }}>
          {isMorning ? '☀' : isAfternoon ? '◌' : isEvening ? '◐' : '☾'}
        </Text>
      </Animated.View>

      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={{
            backgroundColor: index === 0 ? '#FFFFFF' : accentColor,
            borderRadius: 999,
            bottom: 26 + index * 24,
            height: 16 + index * 5,
            left: 24 + index * 54,
            opacity: index === 0 ? 0.72 : 0.26,
            position: 'absolute',
            width: 52 + index * 20,
            transform: [
              {
                translateX: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, index % 2 === 0 ? 10 : -8],
                }),
              },
            ],
          }}
        />
      ))}

      <View style={{ maxWidth: 220, gap: 8 }}>
        <Text selectable style={{ color: '#273D31', fontSize: 20, fontWeight: '900' }}>
          {title}
        </Text>
        <Text selectable style={{ color: '#52675A', fontSize: 14, lineHeight: 20 }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function SoftPickerButton({
  isSelected,
  onPress,
  children,
}: {
  isSelected: boolean;
  onPress: () => void;
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
      onPress={onPress}
      onPressIn={() => animateScale(0.97)}
      onPressOut={() => animateScale(1)}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          backgroundColor: isSelected ? '#E3FFD3' : '#F8FBF3',
          borderColor: isSelected ? '#8BD978' : '#E0E9D7',
          borderRadius: 16,
          borderWidth: 1,
          paddingHorizontal: 20,
          paddingVertical: 9,
          transform: [{ scale }],
        }}
      >
        <Text
          selectable
          style={{
            color: '#274230',
            fontSize: 16,
            fontWeight: '900',
            textAlign: 'center',
          }}
        >
          {children}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function GentleReminderPanel({
  onSelectReminderTime,
  reminderTimeOptions,
  todayCompleted,
  userPreferences,
}: GentleReminderPanelProps) {
  const [selectedDate, setSelectedDate] = useState(() =>
    getDateFromReminderTime(userPreferences.reminderTime),
  );
  const selectedHour = selectedDate.getHours();
  const selectedMinute = selectedDate.getMinutes();
  const reminderTime = userPreferences.reminderTime ?? '20:00';

  useEffect(() => {
    setSelectedDate(getDateFromReminderTime(userPreferences.reminderTime));
  }, [userPreferences.reminderTime]);

  const commitDate = (date: Date) => {
    setSelectedDate(date);
    onSelectReminderTime(getReminderTimeFromDate(date));
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      commitDate(date);
    }
  };

  const updateWebTime = (part: 'hour' | 'minute', value: number) => {
    const nextDate = new Date(selectedDate);
    if (part === 'hour') {
      nextDate.setHours(value);
    } else {
      nextDate.setMinutes(value);
    }
    commitDate(nextDate);
  };

  return (
    <View
      style={{
        backgroundColor: '#F6FAF0',
        borderColor: '#DFEBDC',
        borderRadius: 24,
        borderWidth: 2,
        gap: 14,
        padding: 16,
      }}
    >
      <ReminderMomentAnimation reminderTime={userPreferences.reminderTime} />
      <Text selectable style={{ color: '#274230', fontSize: 19, fontWeight: '900' }}>
        Daily check-in reminder: {reminderTime}
      </Text>
      <Text selectable style={{ color: '#657766', fontSize: 14, lineHeight: 21 }}>
        小恐龙会在这个时间轻轻提醒你。当天完成后，今日提醒会自动取消。
      </Text>
      <Text selectable style={{ color: todayCompleted ? '#236E2B' : '#7B5A00', fontSize: 14, fontWeight: '900' }}>
        {todayCompleted ? 'Today completed. Reminder is suppressed for today.' : 'Today is still open. Reminder can be scheduled.'}
      </Text>

      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E0E9D7',
          borderRadius: 24,
          borderWidth: 2,
          gap: 12,
          padding: 14,
        }}
      >
        <Text selectable style={{ color: '#274230', fontSize: 15, fontWeight: '900', textAlign: 'center' }}>
          Choose any reminder time 自由选择提醒时间
        </Text>
        {Platform.OS === 'web' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ScrollView
              style={{ maxHeight: 188 }}
              contentContainerStyle={{ gap: 6 }}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <SoftPickerButton
                  key={hour}
                  isSelected={selectedHour === hour}
                  onPress={() => updateWebTime('hour', hour)}
                >
                  {String(hour).padStart(2, '0')}
                </SoftPickerButton>
              ))}
            </ScrollView>
            <Text selectable style={{ alignSelf: 'center', color: '#5F755E', fontSize: 24, fontWeight: '900' }}>
              :
            </Text>
            <ScrollView
              style={{ maxHeight: 188 }}
              contentContainerStyle={{ gap: 6 }}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 12 }, (_, index) => index * 5).map((minute) => (
                <SoftPickerButton
                  key={minute}
                  isSelected={selectedMinute === minute}
                  onPress={() => updateWebTime('minute', minute)}
                >
                  {String(minute).padStart(2, '0')}
                </SoftPickerButton>
              ))}
            </ScrollView>
          </View>
        ) : (
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            mode="time"
            onChange={handleTimeChange}
            themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
            value={selectedDate}
          />
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {reminderTimeOptions.map((option) => {
          const isSelected = userPreferences.reminderTime === option.value;

          return (
            <SoftPickerButton
              key={option.value}
              isSelected={isSelected}
              onPress={() => onSelectReminderTime(option.value)}
            >
              {option.emoji} {option.label}
            </SoftPickerButton>
          );
        })}
      </View>
    </View>
  );
}

export default GentleReminderPanel;
