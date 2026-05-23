import { Animated, Text, View } from 'react-native';

export type LevelProgressInfo = {
  description: string;
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  chineseTitle: string;
  xpMin: number;
  xpMax: number | null;
  nextLevel: number | null;
};

type LevelProgressPanelProps = {
  currentLevel: LevelProgressInfo;
  currentLevelGoal: number;
  levels: LevelProgressInfo[];
  levelProgressWidth: Animated.AnimatedInterpolation<string | number>;
  xp: number;
  xpToNextLevel: number;
};

export function LevelProgressPanel({
  currentLevel,
  currentLevelGoal,
  levels,
  levelProgressWidth,
  xp,
  xpToNextLevel,
}: LevelProgressPanelProps) {
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          backgroundColor: '#F8FFF1',
          borderColor: '#DDEED1',
          borderRadius: 24,
          borderWidth: 2,
          gap: 12,
          padding: 16,
        }}
      >
        <Text selectable style={{ color: '#24412E', fontSize: 22, fontWeight: '900' }}>
          {currentLevel.chineseTitle} {currentLevel.title}
        </Text>
        <Text selectable style={{ color: '#5A6F62', fontSize: 15, lineHeight: 22 }}>
          {currentLevel.description}
        </Text>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text selectable style={{ color: '#2D5038', fontSize: 14, fontWeight: '900' }}>
              {currentLevel.nextLevel === null ? 'Max Level' : `Level ${currentLevel.level} Progress`}
            </Text>
            <Text
              selectable
              style={{
                color: '#5E785F',
                fontSize: 14,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
              }}
            >
              {currentLevel.nextLevel === null ? '守护恐龙' : `${xp} / ${currentLevelGoal} XP`}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#CFE9B9',
              borderRadius: 999,
              height: 16,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                backgroundColor: '#3FAE4E',
                borderRadius: 999,
                height: '100%',
                width: levelProgressWidth,
              }}
            />
          </View>
        </View>
        <Text selectable style={{ color: '#6F836F', fontSize: 14, lineHeight: 20 }}>
          {currentLevel.nextLevel === null
            ? '小恐龙已经成长为守护恐龙啦。'
            : `${xpToNextLevel} XP to Level ${currentLevel.nextLevel}\n距离下一级还差 ${xpToNextLevel} XP`}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {levels.map((level) => {
          const isCurrent = level.level === currentLevel.level;
          const isUnlocked = xp >= level.xpMin;

          return (
            <View
              key={level.level}
              style={{
                backgroundColor: isCurrent ? '#FFF7C2' : isUnlocked ? '#F4FFE8' : '#FFFFFF',
                borderColor: isCurrent ? '#F0E29A' : isUnlocked ? '#CDEFAF' : '#E8E6D8',
                borderRadius: 20,
                borderWidth: 2,
                gap: 4,
                opacity: isUnlocked ? 1 : 0.72,
                padding: 14,
              }}
            >
              <Text selectable style={{ color: '#24412E', fontSize: 16, fontWeight: '900' }}>
                Level {level.level} · {level.chineseTitle} {level.title}
              </Text>
              <Text selectable style={{ color: '#6B7F6D', fontSize: 13, lineHeight: 19 }}>
                {level.xpMax === null ? `${level.xpMin}+ XP` : `${level.xpMin}-${level.xpMax} XP`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default LevelProgressPanel;
