import CharacterUnlock, { type CharacterUnlockState } from './character-unlock';

type CharacterClosetPanelProps = {
  characterUnlocks: CharacterUnlockState;
  onSelectCharacterItem: (itemId: string) => void;
  streak: number;
  xp: number;
};

export function CharacterClosetPanel({
  characterUnlocks,
  onSelectCharacterItem,
  streak,
  xp,
}: CharacterClosetPanelProps) {
  return (
    <CharacterUnlock
      activeItem={characterUnlocks.activeItem}
      onSelectItem={onSelectCharacterItem}
      streak={streak}
      unlockedItems={characterUnlocks.unlockedItems}
      xp={xp}
    />
  );
}

export default CharacterClosetPanel;
