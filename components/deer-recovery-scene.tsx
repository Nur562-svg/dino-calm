import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, Text, View } from 'react-native';
import { Group, MathUtils, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { DeerSkin } from './character-unlock';
import type { RecoveryType } from './recommendations';

type DeerState = 'idle' | 'guiding' | 'happy';

export type RecoveryTraining = {
  description: string;
  key: RecoveryType;
  steps: Array<{ english: string; chinese: string }>;
  title: string;
  chineseTitle: string;
};

type DeerRecoverySceneProps = {
  currentStep: { english: string; chinese: string } | null;
  deerModelUri?: string;
  deerSkin?: DeerSkin;
  formattedSeconds: string;
  isCompact: boolean;
  onChooseAnother: () => void;
  onComplete: () => void;
  onPause: () => void;
  onSelectTraining: (training: RecoveryTraining) => void;
  onStart: () => void;
  onNextStep: () => void;
  recoveryCompleted: boolean;
  recoveryPaused: boolean;
  recoveryStarted: boolean;
  selectedTraining: RecoveryTraining | null;
  stepIndex: number;
  trainings: RecoveryTraining[];
};

function SceneButton({
  backgroundColor,
  label,
  onPress,
  textColor,
}: {
  backgroundColor: string;
  label: string;
  onPress: () => void;
  textColor: string;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 24 }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 24 }).start();
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          backgroundColor,
          borderRadius: 999,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 15,
          transform: [{ scale: pressScale }],
        }}
      >
        <Text selectable style={{ color: textColor, fontSize: 16, fontWeight: '800' }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CameraRig() {
  useFrame(({ camera, clock }) => {
    const target = new Vector3(Math.sin(clock.elapsedTime * 0.2) * 0.16, 1.12, 6.5);
    camera.position.lerp(target, 0.04);
    camera.lookAt(0, 0.55, 0);
  });

  return null;
}

function RecoveryBackground() {
  return (
    <group>
      <mesh position={[0, 0.2, -3]} receiveShadow>
        <boxGeometry args={[8.8, 3.8, 0.08]} />
        <meshStandardMaterial color="#EFF8F6" roughness={0.9} />
      </mesh>
      <mesh position={[-2.35, 1.0, -1.8]}>
        <circleGeometry args={[0.64, 32]} />
        <meshStandardMaterial color="#E5F4D7" roughness={0.9} />
      </mesh>
      <mesh position={[2.36, 0.5, -1.6]}>
        <circleGeometry args={[0.78, 32]} />
        <meshStandardMaterial color="#DDEEFF" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
        <planeGeometry args={[8.8, 5.2]} />
        <meshStandardMaterial color="#FFF7E6" roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 1.35]} receiveShadow>
        <planeGeometry args={[5.6, 0.9]} />
        <meshStandardMaterial color="#BFDAD6" roughness={0.86} />
      </mesh>
    </group>
  );
}

function GLTFDeer({ modelUri }: { modelUri: string }) {
  const gltf = useLoader(GLTFLoader, modelUri);

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [gltf.scene]);

  return <primitive object={gltf.scene} scale={1.22} position={[0, -0.68, 0]} />;
}

function FallbackDeer({
  deerSkin,
  leftArmRotation,
  rightArmRotation,
}: {
  deerSkin: DeerSkin;
  leftArmRotation: number;
  rightArmRotation: number;
}) {
  const colors =
    deerSkin === 'spring'
      ? { body: '#C9DFA8', border: '#78985D', belly: '#F6F7D8', antler: '#6D7F57' }
      : { body: '#D8A56F', border: '#9A6C42', belly: '#FFF0D2', antler: '#8A5A35' };

  return (
    <group>
      <mesh castShadow position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.52, 32, 22]} />
        <meshStandardMaterial color={colors.body} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, -0.42, 0]}>
        <sphereGeometry args={[0.46, 32, 20]} />
        <meshStandardMaterial color={colors.body} roughness={0.74} />
      </mesh>
      <mesh position={[0, -0.42, 0.4]}>
        <sphereGeometry args={[0.24, 24, 16]} />
        <meshStandardMaterial color={colors.belly} roughness={0.78} />
      </mesh>
      <mesh position={[-0.18, 0.42, 0.48]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshStandardMaterial color="#2C2D28" />
      </mesh>
      <mesh position={[0.18, 0.42, 0.48]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshStandardMaterial color="#2C2D28" />
      </mesh>
      <mesh castShadow position={[-0.2, 0.8, 0]} rotation={[0, 0, -0.38]}>
        <capsuleGeometry args={[0.035, 0.46, 6, 12]} />
        <meshStandardMaterial color={colors.antler} roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0.2, 0.8, 0]} rotation={[0, 0, 0.38]}>
        <capsuleGeometry args={[0.035, 0.46, 6, 12]} />
        <meshStandardMaterial color={colors.antler} roughness={0.72} />
      </mesh>
      <mesh castShadow position={[-0.44, -0.34, 0.18]} rotation={[0.16, 0, leftArmRotation]}>
        <capsuleGeometry args={[0.07, 0.44, 8, 16]} />
        <meshStandardMaterial color={colors.body} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0.44, -0.34, 0.18]} rotation={[0.16, 0, rightArmRotation]}>
        <capsuleGeometry args={[0.07, 0.44, 8, 16]} />
        <meshStandardMaterial color={colors.body} roughness={0.75} />
      </mesh>
    </group>
  );
}

function RecoveryWorld({
  deerModelUri,
  deerSkin,
  gestureX,
  recoveryCompleted,
  recoveryPaused,
  recoveryStarted,
  selectedTraining,
}: {
  deerModelUri?: string;
  deerSkin: DeerSkin;
  gestureX: number;
  recoveryCompleted: boolean;
  recoveryPaused: boolean;
  recoveryStarted: boolean;
  selectedTraining: RecoveryTraining | null;
}) {
  const deer = useRef<Group>(null);
  const state: DeerState = recoveryCompleted ? 'happy' : selectedTraining ? 'guiding' : 'idle';
  const armSwing = state === 'guiding' ? 0.52 : 0.26;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (deer.current) {
      const guidingSpeed = recoveryStarted && !recoveryPaused ? 2.1 : 0.9;
      deer.current.position.y = Math.sin(t * guidingSpeed) * (state === 'happy' ? 0.11 : 0.055);
      deer.current.position.x = MathUtils.lerp(deer.current.position.x, gestureX * 0.012, 0.08);
      deer.current.rotation.y = Math.sin(t * 0.6) * 0.12 + gestureX * 0.004;
      deer.current.rotation.z = state === 'guiding' ? Math.sin(t * 1.4) * 0.035 : 0;
    }
  });

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.7} />
      <directionalLight castShadow intensity={1.45} position={[3.7, 5.4, 4.6]} />
      <RecoveryBackground />
      <group ref={deer} position={[0, -0.04, 0]}>
        <Suspense
          fallback={
            <FallbackDeer
              deerSkin={deerSkin}
              leftArmRotation={-armSwing}
              rightArmRotation={armSwing}
            />
          }
        >
          {deerModelUri ? (
            <GLTFDeer modelUri={deerModelUri} />
          ) : (
            <FallbackDeer
              deerSkin={deerSkin}
              leftArmRotation={-armSwing + Math.sin(Date.now() * 0.002) * 0.12}
              rightArmRotation={armSwing - Math.sin(Date.now() * 0.002) * 0.12}
            />
          )}
        </Suspense>
      </group>
    </>
  );
}

export function DeerRecoveryScene({
  currentStep,
  deerModelUri,
  deerSkin = 'default',
  formattedSeconds,
  isCompact,
  onChooseAnother,
  onComplete,
  onNextStep,
  onPause,
  onSelectTraining,
  onStart,
  recoveryCompleted,
  recoveryPaused,
  recoveryStarted,
  selectedTraining,
  stepIndex,
  trainings,
}: DeerRecoverySceneProps) {
  const [gestureX, setGestureX] = useState(0);
  const xpBounce = useRef(new Animated.Value(1)).current;
  const streakGlow = useRef(new Animated.Value(0)).current;
  const gestureHint = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
      onPanResponderMove: (_, gesture) => {
        setGestureX(Math.max(-36, Math.min(36, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        setGestureX(0);

        if (Math.abs(gesture.dx) > 42 && selectedTraining) {
          onNextStep();
        }
      },
    }),
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(gestureHint, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(gestureHint, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [gestureHint]);

  const completeWithReward = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(xpBounce, { toValue: 1.14, useNativeDriver: true, speed: 18 }),
        Animated.spring(xpBounce, { toValue: 1, useNativeDriver: true, speed: 18 }),
      ]),
      Animated.sequence([
        Animated.timing(streakGlow, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(streakGlow, { toValue: 0, duration: 640, useNativeDriver: true }),
      ]),
    ]).start();
    onComplete();
  };

  return (
    <View style={{ gap: 14 }}>
      <View
        {...panResponder.panHandlers}
        style={{
          backgroundColor: '#EFF8F6',
          borderColor: '#D5E8E5',
          borderRadius: 30,
          borderWidth: 2,
          minHeight: isCompact ? 338 : 376,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Canvas camera={{ fov: 42, position: [0, 1.12, 6.5] }} shadows>
          <RecoveryWorld
            deerModelUri={deerModelUri}
            deerSkin={deerSkin}
            gestureX={gestureX}
            recoveryCompleted={recoveryCompleted}
            recoveryPaused={recoveryPaused}
            recoveryStarted={recoveryStarted}
            selectedTraining={selectedTraining}
          />
        </Canvas>
      </View>

      <Animated.View style={{ transform: [{ scale: gestureHint }] }}>
        <Text selectable style={{ color: '#5D7473', fontSize: 13, fontWeight: '800', textAlign: 'center' }}>
          Swipe the scene gently to guide Deer. 轻轻滑动场景，帮助小鹿带动作。
        </Text>
      </Animated.View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Animated.View style={{ backgroundColor: '#E3FFD3', borderRadius: 18, flex: 1, padding: 12, transform: [{ scale: xpBounce }] }}>
          <Text selectable style={{ color: '#1F6B2C', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
            XP +10
          </Text>
        </Animated.View>
        <View style={{ backgroundColor: '#FFF5BA', borderRadius: 18, flex: 1, overflow: 'hidden', padding: 12 }}>
          <Animated.View style={{ backgroundColor: '#FFE168', borderRadius: 18, bottom: 0, left: 0, opacity: streakGlow, position: 'absolute', right: 0, top: 0 }} />
          <Text selectable style={{ color: '#7B5A00', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
            Streak ✦
          </Text>
        </View>
      </View>

      {selectedTraining === null ? (
        <View style={{ gap: 12 }}>
          {trainings.map((training) => (
            <Pressable key={training.key} onPress={() => onSelectTraining(training)}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#D5E8E5',
                  borderRadius: 24,
                  borderWidth: 2,
                  gap: 8,
                  padding: 16,
                }}
              >
                <Text selectable style={{ color: '#244F67', fontSize: 18, fontWeight: '900' }}>
                  {training.title}
                  {'\n'}
                  {training.chineseTitle}
                </Text>
                <Text selectable style={{ color: '#5D7473', fontSize: 15, lineHeight: 22 }}>
                  {training.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ backgroundColor: '#FFFFFF', borderColor: '#D5E8E5', borderRadius: 26, borderWidth: 2, gap: 12, padding: 18 }}>
          <Text selectable style={{ color: '#244F67', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
            {selectedTraining.title}
            {'\n'}
            {selectedTraining.chineseTitle}
          </Text>
          <Text selectable style={{ color: '#658083', fontSize: 14, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase' }}>
            Step {stepIndex + 1} / {selectedTraining.steps.length}
          </Text>
          <Text selectable style={{ color: '#365D62', fontSize: 18, fontWeight: '800', lineHeight: 26, textAlign: 'center' }}>
            {currentStep?.english ?? 'Choose a tiny movement.'}
            {'\n'}
            {currentStep?.chinese ?? '选择一个轻轻动作。'}
          </Text>
          <Text selectable style={{ color: '#244F67', fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
            {formattedSeconds}
          </Text>
        </View>
      )}

      <View style={{ gap: 10 }}>
        {selectedTraining ? (
          <>
            {recoveryStarted ? (
              <SceneButton backgroundColor="#FFE5B8" label={recoveryPaused ? 'Resume 继续' : 'Pause 暂停'} onPress={onPause} textColor="#65411F" />
            ) : (
              <SceneButton backgroundColor="#CFF1BF" label="Start Training 开始训练" onPress={onStart} textColor="#214D2A" />
            )}
            <SceneButton backgroundColor="#DFF0FF" label="Next Step 下一步" onPress={onNextStep} textColor="#21405A" />
            <SceneButton backgroundColor="#69C651" label="Complete 完成" onPress={completeWithReward} textColor="#183826" />
            <SceneButton backgroundColor="#EEF4E9" label="Choose Another 换一个训练" onPress={onChooseAnother} textColor="#35503A" />
          </>
        ) : null}
      </View>
    </View>
  );
}

export default DeerRecoveryScene;
