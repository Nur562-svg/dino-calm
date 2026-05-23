import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

type FeatureCircleButtonProps = {
  activeScale: Animated.Value;
  icon: string;
  label: string;
  onPress: () => void;
};

export function FeatureCircleButton({
  activeScale,
  icon,
  label,
  onPress,
}: FeatureCircleButtonProps) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      speed: 26,
      bounciness: 5,
    }).start();
  };

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => animateScale(1.06)}
      onPressOut={() => animateScale(1)}
      style={{ alignItems: 'center', flex: 1, gap: 6, maxWidth: 78 }}
    >
      <Animated.View
        style={{
          transform: [{ scale: Animated.multiply(pressScale, activeScale) }],
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderColor: '#DDEED1',
            borderRadius: 999,
            borderWidth: 2,
            height: 58,
            justifyContent: 'center',
            width: 58,
            boxShadow: '0 10px 18px rgba(87, 121, 69, 0.14)',
          }}
        >
          <Text selectable style={{ color: '#274230', fontSize: 22, fontWeight: '900' }}>
            {icon}
          </Text>
        </View>
      </Animated.View>
      <Text
        selectable
        numberOfLines={2}
        style={{
          color: '#617866',
          fontSize: 9,
          fontWeight: '900',
          lineHeight: 11,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default FeatureCircleButton;
