import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';

import type { MoodValue } from './recommendations';

export type MoodSelectorOption = {
  emoji: string;
  label: string;
  subLabel: string;
  tone: 'positive' | 'heavy';
  value: MoodValue;
};

type MoodSelectorProps = {
  moods: MoodSelectorOption[];
  onSelectMood: (mood: MoodSelectorOption) => void;
  selectedMood: MoodValue | null;
};

function MoodChoiceCard({
  mood,
  onPress,
  selected,
}: {
  mood: MoodSelectorOption;
  onPress: () => void;
  selected: boolean;
}) {
  const motion = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const isPositive = mood.tone === 'positive';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: isPositive ? 1400 : 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: isPositive ? 1400 : 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [isPositive, motion]);

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      speed: 26,
      bounciness: 4,
    }).start();
  };
  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isPositive ? -6 : 4],
  });
  const rotate = motion.interpolate({
    inputRange: [0, 1],
    outputRange:
      mood.value === 'Angry'
        ? ['-4deg', '4deg']
        : mood.value === 'Anxious'
          ? ['-2deg', '2deg']
          : ['0deg', '0deg'],
  });

  return (
    <Pressable
      accessibilityLabel={`Pick ${mood.label}`}
      onPress={onPress}
      onPressIn={() => animatePress(0.98)}
      onPressOut={() => animatePress(1)}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          backgroundColor: selected ? '#E3FFD3' : isPositive ? '#F6FFF0' : '#FFF7F0',
          borderColor: selected ? '#4FAE49' : isPositive ? '#CDEFAF' : '#FFD8C8',
          borderRadius: 24,
          borderWidth: 2,
          flexDirection: 'row',
          gap: 14,
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
          transform: [{ scale: pressScale }],
          boxShadow: selected
            ? '0 12px 22px rgba(82, 156, 73, 0.18)'
            : '0 8px 14px rgba(101, 128, 89, 0.08)',
        }}
      >
        <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
          <Text selectable style={{ fontSize: 30 }}>
            {mood.emoji}
          </Text>
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text selectable style={{ color: '#274230', fontSize: 17, fontWeight: '900' }}>
            {mood.label}
          </Text>
          <Text selectable style={{ color: '#617866', fontSize: 14, fontWeight: '800' }}>
            {mood.subLabel}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: selected ? '#FFFFFF' : '#F4F8EE',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text
            selectable
            style={{
              color: selected ? '#236E2B' : '#7A907C',
              fontSize: 13,
              fontWeight: '900',
            }}
          >
            {selected ? 'Saved' : 'Pick'}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function MoodSelector({ moods, onSelectMood, selectedMood }: MoodSelectorProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text
        selectable
        style={{
          color: '#5B7562',
          fontSize: 15,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        Tap Pick to save this moment. 选择一个表情，小恐龙会记住此刻。
      </Text>
      {moods.map((mood) => (
        <MoodChoiceCard
          key={mood.value}
          mood={mood}
          onPress={() => onSelectMood(mood)}
          selected={selectedMood === mood.value}
        />
      ))}
    </View>
  );
}

export default MoodSelector;
