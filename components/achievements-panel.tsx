import { AchievementList, type AchievementId } from './achievements';

type AchievementsPanelProps = {
  characterUnlockRecords: Array<{
    conditionLabel: string;
    emoji: string;
    id: string;
    isUnlocked: boolean;
    title: string;
    unlockCopy: string;
  }>;
  unlockedAchievementIds: AchievementId[];
};

export function AchievementsPanel({
  characterUnlockRecords,
  unlockedAchievementIds,
}: AchievementsPanelProps) {
  return (
    <AchievementList
      characterUnlockRecords={characterUnlockRecords}
      unlockedAchievementIds={unlockedAchievementIds}
    />
  );
}

export default AchievementsPanel;
