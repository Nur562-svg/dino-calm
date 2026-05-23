import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { Suspense, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Group, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type MeditationSceneProps = {
  accessories: string[];
  companionCopy: string;
  dinoModelUri?: string;
  formattedTime: string;
  isCompact: boolean;
  isPaused: boolean;
  isRunning: boolean;
  meditationCompleted: boolean;
  onBack: () => void;
  onComplete: () => void;
  onPause: () => void;
  onReset: () => void;
  onSelectMinutes: (minutes: 1 | 3 | 5) => void;
  onStart: () => void;
  phaseCopy: string;
  selectedMinutes: 1 | 3 | 5 | null;
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
    const target = new Vector3(Math.sin(clock.elapsedTime * 0.18) * 0.14, 1.12, 6.6);
    camera.position.lerp(target, 0.04);
    camera.lookAt(0, 0.68, 0);
  });

  return null;
}

function MeditationBackground() {
  return (
    <group>
      <mesh position={[0, 0.2, -3]} receiveShadow>
        <boxGeometry args={[8.8, 3.8, 0.08]} />
        <meshStandardMaterial color="#F4F8FF" roughness={0.9} />
      </mesh>
      <mesh position={[-2.2, 1.05, -1.8]}>
        <circleGeometry args={[0.62, 32]} />
        <meshStandardMaterial color="#E3F5DB" roughness={0.9} />
      </mesh>
      <mesh position={[2.4, 0.58, -1.6]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#FFF7D3" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
        <planeGeometry args={[8.8, 5.2]} />
        <meshStandardMaterial color="#E9E9D7" roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 1.4]} receiveShadow>
        <circleGeometry args={[1.45, 48]} />
        <meshStandardMaterial color="#D9E7FF" roughness={0.86} />
      </mesh>
    </group>
  );
}

function GLTFDino({ modelUri }: { modelUri: string }) {
  const gltf = useLoader(GLTFLoader, modelUri);

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [gltf.scene]);

  return <primitive object={gltf.scene} scale={1.25} position={[0, -0.64, 0]} />;
}

function FallbackMeditatingDino() {
  return (
    <group>
      <mesh castShadow position={[0, 0.36, 0]}>
        <sphereGeometry args={[0.58, 32, 24]} />
        <meshStandardMaterial color="#BDEB95" roughness={0.68} />
      </mesh>
      <mesh castShadow position={[0, -0.34, 0]}>
        <sphereGeometry args={[0.44, 32, 20]} />
        <meshStandardMaterial color="#BDEB95" roughness={0.68} />
      </mesh>
      <mesh position={[-0.2, 0.52, 0.52]} scale={[1, 0.24, 1]}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshStandardMaterial color="#263B28" />
      </mesh>
      <mesh position={[0.2, 0.52, 0.52]} scale={[1, 0.24, 1]}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshStandardMaterial color="#263B28" />
      </mesh>
      <mesh castShadow position={[-0.35, -0.78, 0.24]} rotation={[0.2, 0, 0.95]}>
        <capsuleGeometry args={[0.09, 0.52, 8, 16]} />
        <meshStandardMaterial color="#9BD67B" roughness={0.74} />
      </mesh>
      <mesh castShadow position={[0.35, -0.78, 0.24]} rotation={[0.2, 0, -0.95]}>
        <capsuleGeometry args={[0.09, 0.52, 8, 16]} />
        <meshStandardMaterial color="#9BD67B" roughness={0.74} />
      </mesh>
    </group>
  );
}

function BreathRing({ index, isRunning }: { index: number; isRunning: boolean }) {
  const ring = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (isRunning ? 0.55 : 0.34) + index * 0.85;
    const pulse = 1 + (Math.sin(t) + 1) * 0.18;

    if (ring.current) {
      ring.current.scale.setScalar(pulse + index * 0.18);
      ring.current.rotation.z += 0.003 + index * 0.001;
    }
  });

  return (
    <group ref={ring} position={[0, 0.0, -0.1]}>
      <mesh>
        <torusGeometry args={[1.0 + index * 0.14, 0.018, 16, 88]} />
        <meshStandardMaterial color={index === 0 ? '#9FC7FF' : '#BDEB95'} transparent opacity={0.38} />
      </mesh>
    </group>
  );
}

function MeditationWorld({
  dinoModelUri,
  isPaused,
  isRunning,
}: {
  dinoModelUri?: string;
  isPaused: boolean;
  isRunning: boolean;
}) {
  const dino = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (dino.current) {
      dino.current.position.y = Math.sin(t * (isRunning && !isPaused ? 1.15 : 0.7)) * 0.055;
      dino.current.rotation.y = Math.sin(t * 0.42) * 0.11;
      dino.current.rotation.z = Math.sin(t * 0.36) * 0.025;
    }
  });

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.72} />
      <directionalLight castShadow intensity={1.38} position={[3.8, 5.2, 4.3]} />
      <MeditationBackground />
      <BreathRing index={0} isRunning={isRunning && !isPaused} />
      <BreathRing index={1} isRunning={isRunning && !isPaused} />
      <group ref={dino} position={[0, -0.04, 0]}>
        <Suspense fallback={<FallbackMeditatingDino />}>
          {dinoModelUri ? <GLTFDino modelUri={dinoModelUri} /> : <FallbackMeditatingDino />}
        </Suspense>
      </group>
    </>
  );
}

export function MeditationScene({
  companionCopy,
  dinoModelUri,
  formattedTime,
  isCompact,
  isPaused,
  isRunning,
  meditationCompleted,
  onBack,
  onComplete,
  onPause,
  onReset,
  onSelectMinutes,
  onStart,
  phaseCopy,
  selectedMinutes,
}: MeditationSceneProps) {
  const xpBounce = useRef(new Animated.Value(1)).current;
  const streakGlow = useRef(new Animated.Value(0)).current;

  const completeWithReward = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(xpBounce, { toValue: 1.14, useNativeDriver: true, speed: 18 }),
        Animated.spring(xpBounce, { toValue: 1, useNativeDriver: true, speed: 18 }),
      ]),
      Animated.sequence([
        Animated.timing(streakGlow, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(streakGlow, { toValue: 0, duration: 620, useNativeDriver: true }),
      ]),
    ]).start();
    onComplete();
  };

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          backgroundColor: '#F4F8FF',
          borderColor: '#DDEAF5',
          borderRadius: 30,
          borderWidth: 2,
          minHeight: isCompact ? 338 : 376,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Canvas camera={{ fov: 42, position: [0, 1.12, 6.6] }} shadows>
          <MeditationWorld dinoModelUri={dinoModelUri} isPaused={isPaused} isRunning={isRunning} />
        </Canvas>
      </View>

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

      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, gap: 8, padding: 16 }}>
        <Text selectable style={{ color: '#3D4775', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
          Meditation with Dino
        </Text>
        <Text selectable style={{ color: '#5D6B8A', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
          {companionCopy}
        </Text>
        <Text selectable style={{ color: '#41506E', fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
          {formattedTime}
        </Text>
        <Text selectable style={{ color: '#677794', fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
          {phaseCopy}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 3, 5].map((minutes) => (
          <View key={minutes} style={{ flex: 1 }}>
            <SceneButton
              backgroundColor={selectedMinutes === minutes ? '#DDEBFF' : '#FFFFFF'}
              label={`${minutes} min`}
              onPress={() => onSelectMinutes(minutes as 1 | 3 | 5)}
              textColor="#3D4775"
            />
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {isRunning ? (
          <SceneButton backgroundColor="#FFE5B8" label={isPaused ? 'Resume 继续' : 'Pause 暂停'} onPress={onPause} textColor="#65411F" />
        ) : (
          <SceneButton backgroundColor="#CFF1BF" label="Start Meditation 开始冥想" onPress={onStart} textColor="#214D2A" />
        )}
        <SceneButton
          backgroundColor={meditationCompleted ? '#69C651' : '#FFF2A6'}
          label={meditationCompleted ? 'Complete 完成' : 'Complete Early 提前完成'}
          onPress={completeWithReward}
          textColor="#183826"
        />
        <SceneButton backgroundColor="#DFF0FF" label="Reset 重置" onPress={onReset} textColor="#21405A" />
        <SceneButton backgroundColor="#EEF4E9" label="Back 返回" onPress={onBack} textColor="#35503A" />
      </View>
    </View>
  );
}

export default MeditationScene;
