import { Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type FeaturePanelKey = 'level' | 'closet' | 'reminder' | 'achievements';

type FeaturePanelProps = {
  activePanel: FeaturePanelKey | null;
  animation: Animated.Value;
  children: React.ReactNode;
  onClose: () => void;
  width: number;
};

const PANEL_COPY: Record<FeaturePanelKey, { eyebrow: string; title: string }> = {
  level: { eyebrow: 'Growth path', title: 'Level Progress' },
  closet: { eyebrow: 'Dino style', title: 'Character Closet' },
  reminder: { eyebrow: 'Soft check-in', title: 'Gentle Reminder' },
  achievements: { eyebrow: 'Collected moments', title: 'Achievements' },
};

const PANEL_ORIGIN_Y: Record<FeaturePanelKey, number> = {
  level: 120,
  closet: 120,
  reminder: 148,
  achievements: 148,
};

export function FeaturePanel({
  activePanel,
  animation,
  children,
  onClose,
  width,
}: FeaturePanelProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  if (!activePanel) {
    return null;
  }

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.min(width * 0.22, 90), 0],
  });
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_ORIGIN_Y[activePanel], 0],
  });
  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });
  const opacity = animation.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0.8, 1],
  });
  const top = insets.top + 24;
  const bottom = insets.bottom + 24;
  const maxHeight = Math.max(280, height - insets.top - insets.bottom - 48);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        bottom: 0,
        left: 0,
        opacity,
        position: 'absolute',
        right: 0,
        top: 0,
      }}
    >
      <Pressable
        accessibilityLabel="Close feature panel backdrop"
        onPress={onClose}
        style={{
          backgroundColor: 'rgba(40, 66, 46, 0.18)',
          bottom: 0,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <Animated.View
        style={{
          backgroundColor: '#FFFDF3',
          borderRadius: 34,
          bottom,
          left: 12,
          maxHeight,
          padding: 18,
          paddingTop: 20,
          position: 'absolute',
          right: 12,
          top,
          transform: [{ translateX }, { translateY }, { scale }],
          boxShadow: '0 18px 34px rgba(60, 92, 54, 0.18)',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              selectable
              style={{
                color: '#7A927A',
                fontSize: 12,
                fontWeight: '900',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {PANEL_COPY[activePanel].eyebrow}
            </Text>
            <Text selectable style={{ color: '#183826', fontSize: 25, fontWeight: '900' }}>
              {PANEL_COPY[activePanel].title}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close feature panel"
            onPress={onClose}
            style={{
              alignItems: 'center',
              backgroundColor: '#EEF8DD',
              borderRadius: 999,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            <Text selectable style={{ color: '#35503A', fontSize: 20, fontWeight: '900' }}>
              ×
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 14, paddingBottom: 38, paddingTop: 18 }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

export default FeaturePanel;
