import { Text, View } from 'react-native';

export type AchievementId = 'streak-3' | 'xp-100' | 'streak-7' | 'xp-250';

export type Achievement = {
  accessoryLabel?: string;
  description: string;
  emoji: string;
  id: AchievementId;
  title: string;
  unlockCopy: string;
};

export const ACHIEVEMENT_STORAGE_KEY = 'dino-calm-achievements';

export const ACHIEVEMENTS: Achievement[] = [
  {
    accessoryLabel: 'Scarf',
    description: '连续 3 天完成任意解压方式。',
    emoji: '🧣',
    id: 'streak-3',
    title: '3天连续放松',
    unlockCopy: '小恐龙解锁了温柔围巾。',
  },
  {
    accessoryLabel: 'Flower',
    description: '累计获得 100 XP。',
    emoji: '🌸',
    id: 'xp-100',
    title: '100 XP累计',
    unlockCopy: '小恐龙收到了一朵小花。',
  },
  {
    accessoryLabel: 'Star',
    description: '连续 7 天完成任意解压方式。',
    emoji: '⭐',
    id: 'streak-7',
    title: '7天稳定陪伴',
    unlockCopy: '小恐龙身边亮起了一颗小星星。',
  },
  {
    accessoryLabel: 'Crown',
    description: '累计获得 250 XP。',
    emoji: '👑',
    id: 'xp-250',
    title: '250 XP累计',
    unlockCopy: '小恐龙获得了守护小皇冠。',
  },
];

export const getUnlockedAchievementIds = ({
  streak,
  xp,
}: {
  streak: number;
  xp: number;
}) =>
  ACHIEVEMENTS.filter((achievement) => {
    if (achievement.id === 'streak-3') {
      return streak >= 3;
    }

    if (achievement.id === 'streak-7') {
      return streak >= 7;
    }

    if (achievement.id === 'xp-100') {
      return xp >= 100;
    }

    return xp >= 250;
  }).map((achievement) => achievement.id);

export const getAchievementAccessories = (achievementIds: AchievementId[]) =>
  ACHIEVEMENTS.filter(
    (achievement) => achievement.accessoryLabel && achievementIds.includes(achievement.id),
  ).map((achievement) => achievement.accessoryLabel as string);

export function AchievementList({
  characterUnlockRecords = [],
  unlockedAchievementIds,
}: {
  characterUnlockRecords?: Array<{
    conditionLabel: string;
    emoji: string;
    id: string;
    isUnlocked: boolean;
    title: string;
    unlockCopy: string;
  }>;
  unlockedAchievementIds: AchievementId[];
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFDF3',
        borderRadius: 24,
        padding: 16,
        gap: 12,
        borderWidth: 2,
        borderColor: '#EFE6BB',
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#6F5C17',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          Achievements
        </Text>
        <Text
          selectable
          style={{
            fontSize: 18,
            fontWeight: '900',
            color: '#2E442D',
          }}
        >
          成就和小饰品
        </Text>
      </View>

      {ACHIEVEMENTS.map((achievement) => {
        const isUnlocked = unlockedAchievementIds.includes(achievement.id);

        return (
          <View
            key={achievement.id}
            style={{
              backgroundColor: isUnlocked ? '#F4FFE8' : '#FFFFFF',
              borderRadius: 18,
              padding: 12,
              gap: 5,
              borderWidth: 1,
              borderColor: isUnlocked ? '#CDEFAF' : '#E8E6D8',
              opacity: isUnlocked ? 1 : 0.76,
            }}
          >
            <Text
              selectable
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: isUnlocked ? '#285A30' : '#79806F',
              }}
            >
              {achievement.emoji} {achievement.title}
            </Text>
            <Text
              selectable
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: isUnlocked ? '#567058' : '#858C7A',
              }}
            >
              {isUnlocked ? achievement.unlockCopy : achievement.description}
            </Text>
          </View>
        );
      })}

      {characterUnlockRecords.length > 0 ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Text
            selectable
            style={{
              color: '#6F5C17',
              fontSize: 14,
              fontWeight: '900',
            }}
          >
            Character unlock records 角色解锁记录
          </Text>
          {characterUnlockRecords.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: item.isUnlocked ? '#F0FBFF' : '#FFFFFF',
                borderColor: item.isUnlocked ? '#B9DDEA' : '#E8E6D8',
                borderRadius: 18,
                borderWidth: 1,
                gap: 5,
                opacity: item.isUnlocked ? 1 : 0.76,
                padding: 12,
              }}
            >
              <Text
                selectable
                style={{
                  color: item.isUnlocked ? '#244F67' : '#79806F',
                  fontSize: 16,
                  fontWeight: '900',
                }}
              >
                {item.emoji} {item.title}
              </Text>
              <Text
                selectable
                style={{
                  color: item.isUnlocked ? '#526F79' : '#858C7A',
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {item.isUnlocked ? item.unlockCopy : item.conditionLabel}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
