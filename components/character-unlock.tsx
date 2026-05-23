import { Pressable, Text, View } from 'react-native';

export type CharacterUnlockItemId =
  | 'default-dino'
  | 'dino-hat'
  | 'dino-scarf'
  | 'deer-spring'
  | 'dino-flower'
  | 'dino-crown';

export type CharacterUnlockState = {
  unlockedItems: string[];
  activeItem: string;
};

export type DeerSkin = 'default' | 'spring';

export type CharacterUnlockItem = {
  accessoryLabel?: string;
  activeCopy: string;
  category: 'dino' | 'deer';
  conditionLabel: string;
  deerSkin?: DeerSkin;
  emoji: string;
  id: CharacterUnlockItemId;
  title: string;
  unlockCopy: string;
  unlockType: 'default' | 'streak' | 'xp';
  unlockValue: number;
};

export const CHARACTER_UNLOCK_STORAGE_KEY = 'dino-calm-character-unlocks';
export const DEFAULT_CHARACTER_ITEM_ID: CharacterUnlockItemId = 'default-dino';

export const CHARACTER_UNLOCKS: CharacterUnlockItem[] = [
  {
    activeCopy: 'Dino is keeping today simple.',
    category: 'dino',
    conditionLabel: 'Default companion',
    emoji: '🦕',
    id: 'default-dino',
    title: 'Classic Dino',
    unlockCopy: '默认小恐龙已准备好陪你。',
    unlockType: 'default',
    unlockValue: 0,
  },
  {
    accessoryLabel: 'Hat',
    activeCopy: 'Dino is wearing a tiny calm hat.',
    category: 'dino',
    conditionLabel: '3天连续完成解压',
    emoji: '🧢',
    id: 'dino-hat',
    title: 'Dino 帽子',
    unlockCopy: '小恐龙解锁了出门小帽子。',
    unlockType: 'streak',
    unlockValue: 3,
  },
  {
    accessoryLabel: 'Scarf',
    activeCopy: 'Dino is wrapped in a soft scarf.',
    category: 'dino',
    conditionLabel: '50 XP',
    emoji: '🧣',
    id: 'dino-scarf',
    title: 'Dino 围巾',
    unlockCopy: '小恐龙解锁了温柔围巾。',
    unlockType: 'xp',
    unlockValue: 50,
  },
  {
    activeCopy: 'Deer has a fresh spring coat for recovery.',
    category: 'deer',
    conditionLabel: '100 XP',
    deerSkin: 'spring',
    emoji: '🦌',
    id: 'deer-spring',
    title: '小鹿新皮肤',
    unlockCopy: '小鹿换上了浅春色皮肤。',
    unlockType: 'xp',
    unlockValue: 100,
  },
  {
    accessoryLabel: 'Flower',
    activeCopy: 'Dino is carrying one little flower.',
    category: 'dino',
    conditionLabel: '150 XP',
    emoji: '🌸',
    id: 'dino-flower',
    title: 'Dino 小花',
    unlockCopy: '小恐龙收到了一朵小花。',
    unlockType: 'xp',
    unlockValue: 150,
  },
  {
    accessoryLabel: 'Crown',
    activeCopy: 'Dino is wearing the guardian crown.',
    category: 'dino',
    conditionLabel: '250 XP',
    emoji: '👑',
    id: 'dino-crown',
    title: 'Dino 皇冠',
    unlockCopy: '小恐龙获得了守护小皇冠。',
    unlockType: 'xp',
    unlockValue: 250,
  },
];

export const getUnlockedCharacterItemIds = ({
  streak,
  xp,
}: {
  streak: number;
  xp: number;
}) =>
  CHARACTER_UNLOCKS.filter((item) => {
    if (item.unlockType === 'default') {
      return true;
    }

    if (item.unlockType === 'streak') {
      return streak >= item.unlockValue;
    }

    return xp >= item.unlockValue;
  }).map((item) => item.id);

export const resolveCharacterUnlockState = ({
  savedState,
  streak,
  xp,
}: {
  savedState?: CharacterUnlockState | null;
  streak: number;
  xp: number;
}): CharacterUnlockState => {
  const earnedItems = getUnlockedCharacterItemIds({ streak, xp });
  const unlockedItems = Array.from(
    new Set([DEFAULT_CHARACTER_ITEM_ID, ...(savedState?.unlockedItems ?? []), ...earnedItems]),
  );
  const activeItem =
    savedState?.activeItem && unlockedItems.includes(savedState.activeItem)
      ? savedState.activeItem
      : DEFAULT_CHARACTER_ITEM_ID;

  return { unlockedItems, activeItem };
};

export const getActiveCharacterAccessories = (activeItem: string) => {
  const item = CHARACTER_UNLOCKS.find((unlock) => unlock.id === activeItem);

  return item?.accessoryLabel ? [item.accessoryLabel] : [];
};

export const getActiveDeerSkin = (activeItem: string): DeerSkin => {
  const item = CHARACTER_UNLOCKS.find((unlock) => unlock.id === activeItem);

  return item?.deerSkin ?? 'default';
};

export function CharacterUnlock({
  activeItem,
  onSelectItem,
  streak,
  unlockedItems,
  xp,
}: {
  activeItem: string;
  onSelectItem: (itemId: string) => void;
  streak: number;
  unlockedItems: string[];
  xp: number;
}) {
  return (
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
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            color: '#5F755E',
            fontSize: 14,
            fontWeight: '900',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          Character closet
        </Text>
        <Text selectable style={{ color: '#24412E', fontSize: 18, fontWeight: '900' }}>
          角色解锁和服饰
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {CHARACTER_UNLOCKS.map((item) => {
          const isUnlocked = unlockedItems.includes(item.id);
          const isActive = activeItem === item.id;

          return (
            <Pressable
              key={item.id}
              disabled={!isUnlocked}
              onPress={() => onSelectItem(item.id)}
              style={{ opacity: isUnlocked ? 1 : 0.62 }}
            >
              <View
                style={{
                  backgroundColor: isActive ? '#E3FFD3' : '#FFFFFF',
                  borderColor: isActive ? '#4FAE49' : '#E4EBDC',
                  borderRadius: 18,
                  borderWidth: 2,
                  gap: 5,
                  minHeight: 118,
                  padding: 12,
                  width: 136,
                }}
              >
                <Text selectable style={{ fontSize: 24 }}>
                  {item.emoji}
                </Text>
                <Text
                  selectable
                  style={{
                    color: isUnlocked ? '#24412E' : '#7A8474',
                    fontSize: 14,
                    fontWeight: '900',
                    lineHeight: 19,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  selectable
                  style={{
                    color: isUnlocked ? '#5F755E' : '#8A927F',
                    fontSize: 12,
                    fontWeight: '800',
                    lineHeight: 17,
                  }}
                >
                  {isUnlocked ? (isActive ? 'Active 使用中' : 'Tap to use') : item.conditionLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text selectable style={{ color: '#697D69', fontSize: 13, lineHeight: 19 }}>
        Current progress: {xp} XP, {streak} day streak. 解锁进度会保存在本地。
      </Text>
    </View>
  );
}

export default CharacterUnlock;
