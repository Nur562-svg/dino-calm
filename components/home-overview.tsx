import { useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

import DinoAvatar, { type DinoState } from './dino-avatar';
import FeatureCircleButton from './feature-circle-button';

export type HomePanelKey = 'level' | 'closet' | 'reminder' | 'achievements';

export type HomeLevelInfo = {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  chineseTitle: string;
};

type HomeOverviewProps = {
  activeCharacterAccessories: string[];
  buttonScales: Record<HomePanelKey, Animated.Value>;
  currentLevel: HomeLevelInfo;
  dinoBounce: Animated.Value;
  dinoState: DinoState;
  isCompact: boolean;
  onOpenMood: () => void;
  onOpenPanel: (panel: HomePanelKey) => void;
  onOpenRecovery: () => void;
  streakLabel: string;
  xp: number;
};

function HomeStatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        borderColor: 'rgba(165, 203, 218, 0.42)',
        borderRadius: 999,
        borderWidth: 1,
        flex: 1,
        gap: 2,
        minHeight: 58,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        boxShadow: '0 8px 16px rgba(92, 127, 149, 0.1)',
      }}
    >
      <Text
        selectable
        style={{
          color: '#738599',
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: '#2E4B59',
          fontSize: 20,
          fontWeight: '900',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function HomeOverview({
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
}: HomeOverviewProps) {
  const dinoSize = isCompact ? 186 : 214;
  const swipePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 28 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -46 || gesture.dx > 46) {
          onOpenRecovery();
        }
      },
    }),
  ).current;

  return (
    <View
      {...swipePanResponder.panHandlers}
      style={{
        gap: 18,
        minHeight: isCompact ? 560 : 620,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.64)',
            borderRadius: 32,
            gap: 16,
            padding: 18,
            width: '100%',
            boxShadow: '0 18px 32px rgba(84, 126, 145, 0.12)',
          }}
        >
          <Pressable accessibilityLabel="Start relief journey" onPress={onOpenMood}>
            <Animated.View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: dinoSize * 1.08,
                transform: [{ scale: dinoBounce }],
              }}
            >
              <DinoAvatar accessories={activeCharacterAccessories} state={dinoState} size={dinoSize} />
            </Animated.View>
          </Pressable>

          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text selectable style={{ color: '#7993A2', fontSize: 12, fontWeight: '900' }}>
              Dino Calm / 小恐龙松一口气
            </Text>
            <Text selectable style={{ color: '#253E4B', fontSize: 28, fontWeight: '900' }}>
              Level {currentLevel.level}
            </Text>
            <Text selectable style={{ color: '#6E8390', fontSize: 14, fontWeight: '800' }}>
              {currentLevel.chineseTitle} {currentLevel.title}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <HomeStatPill label="XP" value={`${xp}`} />
            <HomeStatPill label="Streak" value={streakLabel} />
          </View>
        </View>

        <Pressable
          accessibilityLabel="Start Your Relief Journey"
          onPress={onOpenMood}
          style={{
            alignItems: 'center',
            backgroundColor: '#58CC02',
            borderBottomColor: '#43A600',
            borderBottomWidth: 5,
            borderRadius: 999,
            justifyContent: 'center',
            minHeight: 58,
            paddingHorizontal: 22,
            width: '100%',
            boxShadow: '0 14px 24px rgba(64, 158, 35, 0.2)',
          }}
        >
          <Text selectable style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>
            开始今日放松 / Start Your Relief Journey
          </Text>
        </Pressable>
      </View>

      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: 10,
          justifyContent: 'space-between',
          paddingHorizontal: 2,
          paddingTop: 4,
        }}
      >
        <FeatureCircleButton
          activeScale={buttonScales.level}
          icon="↗"
          label="Level Progress"
          onPress={() => onOpenPanel('level')}
        />
        <FeatureCircleButton
          activeScale={buttonScales.closet}
          icon="◒"
          label="Character Closet"
          onPress={() => onOpenPanel('closet')}
        />
        <FeatureCircleButton
          activeScale={buttonScales.reminder}
          icon="☾"
          label="Gentle Reminder"
          onPress={() => onOpenPanel('reminder')}
        />
        <FeatureCircleButton
          activeScale={buttonScales.achievements}
          icon="★"
          label="Achievements"
          onPress={() => onOpenPanel('achievements')}
        />
      </View>
    </View>
  );
}

export default HomeOverview;
