import { useEffect, useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import coffeeAnimation from '../assets/lottie/dino-coffee.json';
import meditationAnimation from '../assets/lottie/dino-meditation.json';
import rehabilitationAnimation from '../assets/lottie/dino-rehabilitation.json';
import walkingAnimation from '../assets/lottie/dino-walking.json';

export type DinoAnimationActionType = 'coffee' | 'walking' | 'rehabilitation' | 'meditation';

type DinoAnimationProps = {
  actionType: DinoAnimationActionType;
  autoPlay?: boolean;
  onAnimationFinish?: (isCancelled: boolean) => void;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const animationByAction = {
  coffee: coffeeAnimation,
  walking: walkingAnimation,
  rehabilitation: rehabilitationAnimation,
  meditation: meditationAnimation,
} as const;

const loopingActions: Record<DinoAnimationActionType, boolean> = {
  coffee: true,
  walking: true,
  rehabilitation: false,
  meditation: true,
};

export function DinoAnimation({
  actionType,
  autoPlay = true,
  onAnimationFinish,
  speed = 1,
  style,
  testID = 'dino-animation',
}: DinoAnimationProps) {
  const animationRef = useRef<LottieView>(null);
  const source = useMemo(() => animationByAction[actionType], [actionType]);
  const loop = loopingActions[actionType];

  useEffect(() => {
    animationRef.current?.reset();

    if (autoPlay) {
      animationRef.current?.play();
    }
  }, [actionType, autoPlay]);

  return (
    <LottieView
      ref={animationRef}
      autoPlay={autoPlay}
      loop={loop}
      onAnimationFinish={onAnimationFinish}
      resizeMode="contain"
      source={source}
      speed={speed}
      style={style}
      testID={testID}
    />
  );
}

export default DinoAnimation;
