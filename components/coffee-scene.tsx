import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { Group, MathUtils, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { DinoState } from './dino-avatar';

type CoffeeSceneProps = {
  accessories: string[];
  companionCopy: string;
  dinoModelUri?: string;
  dinoMood: DinoState;
  formattedSeconds: string;
  isCompact: boolean;
  isRunning: boolean;
  onBack: () => void;
  onComplete: () => void;
  onPause: () => void;
  onStart: () => void;
  secondsLeft: number;
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
        Animated.spring(pressScale, {
          toValue: 0.96,
          useNativeDriver: true,
          speed: 26,
          bounciness: 5,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 26,
          bounciness: 5,
        }).start();
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
    const target = new Vector3(Math.sin(clock.elapsedTime * 0.22) * 0.18, 1.2, 6.4);
    camera.position.lerp(target, 0.045);
    camera.lookAt(0, 0.72, 0);
  });

  return null;
}

function LayeredBackground() {
  return (
    <group>
      <mesh position={[0, 0.1, -2.8]} receiveShadow>
        <boxGeometry args={[8.8, 3.6, 0.08]} />
        <meshStandardMaterial color="#F6F7E8" roughness={0.86} />
      </mesh>
      <mesh position={[-2.7, 0.25, -1.7]}>
        <circleGeometry args={[0.78, 32]} />
        <meshStandardMaterial color="#DDF5C9" roughness={0.9} />
      </mesh>
      <mesh position={[2.25, 1.1, -1.45]}>
        <circleGeometry args={[0.54, 32]} />
        <meshStandardMaterial color="#FFF1B8" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
        <planeGeometry args={[8.8, 5.2]} />
        <meshStandardMaterial color="#E9D2AD" roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.0, 1.45]} receiveShadow>
        <planeGeometry args={[5.2, 1.0]} />
        <meshStandardMaterial color="#C9965A" roughness={0.9} />
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

  return <primitive object={gltf.scene} scale={1.35} position={[0, -0.62, 0]} />;
}

function FallbackDino({
  blink,
  tailSwing,
}: {
  blink: boolean;
  tailSwing: number;
}) {
  return (
    <group>
      <mesh castShadow position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.62, 32, 24]} />
        <meshStandardMaterial color="#BDEB95" roughness={0.66} />
      </mesh>
      <mesh castShadow position={[0, -0.3, 0]}>
        <sphereGeometry args={[0.48, 32, 20]} />
        <meshStandardMaterial color="#BDEB95" roughness={0.66} />
      </mesh>
      <mesh position={[0, -0.3, 0.42]}>
        <sphereGeometry args={[0.28, 24, 16]} />
        <meshStandardMaterial color="#FFF0AE" roughness={0.72} />
      </mesh>
      <mesh position={[-0.22, 0.55, 0.54]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshStandardMaterial color={blink ? '#6EA154' : '#263B28'} />
      </mesh>
      <mesh position={[0.22, 0.55, 0.54]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshStandardMaterial color={blink ? '#6EA154' : '#263B28'} />
      </mesh>
      <mesh castShadow position={[0.42, -0.24, 0.28]} rotation={[0.15, 0, -0.78]}>
        <capsuleGeometry args={[0.08, 0.34, 8, 16]} />
        <meshStandardMaterial color="#BDEB95" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.42, -0.24, 0.28]} rotation={[0.15, 0, 0.78]}>
        <capsuleGeometry args={[0.08, 0.34, 8, 16]} />
        <meshStandardMaterial color="#BDEB95" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[-0.62, -0.34, -0.2]} rotation={[0, tailSwing, -0.42]}>
        <capsuleGeometry args={[0.1, 0.76, 8, 16]} />
        <meshStandardMaterial color="#9BD67B" roughness={0.76} />
      </mesh>
    </group>
  );
}

function CoffeeCup({ steamPhase }: { steamPhase: number }) {
  return (
    <group position={[1.12, -0.34, 0.58]} rotation={[0.05, -0.28, 0]}>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[
            -0.12 + index * 0.12,
            0.55 + Math.sin(steamPhase + index) * 0.08,
            0,
          ]}
          scale={[0.035, 0.28 + index * 0.04, 0.035]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.34} />
        </mesh>
      ))}
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.24, 0.46, 32]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.04, 32]} />
        <meshStandardMaterial color="#8B5A34" roughness={0.82} />
      </mesh>
      <mesh position={[0.33, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.035, 12, 24, Math.PI * 1.35]} />
        <meshStandardMaterial color="#C7905D" roughness={0.66} />
      </mesh>
    </group>
  );
}

function CoffeeWorld({
  dinoModelUri,
  isRunning,
  rewardPulse,
}: {
  dinoModelUri?: string;
  isRunning: boolean;
  rewardPulse: Animated.Value;
}) {
  const dino = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const [blink, setBlink] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (dino.current) {
      dino.current.position.y = Math.sin(t * 1.8) * 0.055;
      dino.current.rotation.y = Math.sin(t * 0.6) * 0.08;
      dino.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.012);
    }

    if (arm.current) {
      arm.current.rotation.z = MathUtils.lerp(
        arm.current.rotation.z,
        isRunning ? -0.55 + Math.sin(t * 3) * 0.08 : -0.25,
        0.12,
      );
    }
  });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let closed = false;

    const loopBlink = () => {
      timeout = setTimeout(() => {
        closed = true;
        setBlink(true);
        setTimeout(() => {
          closed = false;
          setBlink(false);
          loopBlink();
        }, 120);
      }, 2200 + Math.random() * 1800);
    };

    loopBlink();

    return () => {
      clearTimeout(timeout);
      closed = true;
      void closed;
    };
  }, [setBlink]);

  return (
    <>
      <CameraRig />
      <ambientLight intensity={0.68} />
      <directionalLight
        castShadow
        intensity={1.55}
        position={[3.8, 5.2, 4.4]}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <LayeredBackground />
      <group ref={dino} position={[-0.65, -0.15, 0]}>
        <Suspense fallback={<FallbackDino blink={blink} tailSwing={Math.sin(Date.now() * 0.002) * 0.2} />}>
          {dinoModelUri ? <GLTFDino modelUri={dinoModelUri} /> : <FallbackDino blink={blink} tailSwing={0.24} />}
        </Suspense>
        <group ref={arm}>
          <CoffeeCup steamPhase={Date.now() * 0.002} />
        </group>
      </group>
    </>
  );
}

export function CoffeeScene({
  companionCopy,
  dinoModelUri,
  formattedSeconds,
  isCompact,
  isRunning,
  onBack,
  onComplete,
  onPause,
  onStart,
  secondsLeft,
}: CoffeeSceneProps) {
  const xpBounce = useRef(new Animated.Value(1)).current;
  const streakGlow = useRef(new Animated.Value(0)).current;

  const playReward = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(xpBounce, { toValue: 1.15, useNativeDriver: true, speed: 18 }),
        Animated.spring(xpBounce, { toValue: 1, useNativeDriver: true, speed: 18 }),
      ]),
      Animated.sequence([
        Animated.timing(streakGlow, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(streakGlow, {
          toValue: 0,
          duration: 640,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const completeWithReward = () => {
    playReward();
    onComplete();
  };

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          backgroundColor: '#FFF6E3',
          borderColor: '#F3DFB6',
          borderRadius: 30,
          borderWidth: 2,
          minHeight: isCompact ? 338 : 376,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Canvas camera={{ fov: 42, position: [0, 1.15, 6.4] }} shadows>
          <CoffeeWorld dinoModelUri={dinoModelUri} isRunning={isRunning} rewardPulse={xpBounce} />
        </Canvas>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Animated.View
          style={{
            backgroundColor: '#E3FFD3',
            borderRadius: 18,
            flex: 1,
            padding: 12,
            transform: [{ scale: xpBounce }],
          }}
        >
          <Text selectable style={{ color: '#1F6B2C', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
            XP +10
          </Text>
        </Animated.View>
        <View style={{ backgroundColor: '#FFF5BA', borderRadius: 18, flex: 1, overflow: 'hidden', padding: 12 }}>
          <Animated.View
            style={{
              backgroundColor: '#FFE168',
              borderRadius: 18,
              bottom: 0,
              left: 0,
              opacity: streakGlow,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
          <Text selectable style={{ color: '#7B5A00', fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
            Streak ✦
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#FFFDF3', borderRadius: 24, gap: 8, padding: 16 }}>
        <Text selectable style={{ color: '#65411F', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
          Coffee with Dino
        </Text>
        <Text selectable style={{ color: '#806242', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
          {companionCopy}
        </Text>
        <Text selectable style={{ color: '#5A3B1D', fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
          {formattedSeconds}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {isRunning ? (
          <SceneButton backgroundColor="#FFE5B8" label="Pause 暂停" onPress={onPause} textColor="#65411F" />
        ) : (
          <SceneButton backgroundColor="#CFF1BF" label="Start Coffee Break 开始" onPress={onStart} textColor="#214D2A" />
        )}
        <SceneButton
          backgroundColor={secondsLeft === 0 ? '#69C651' : '#FFF2A6'}
          label={secondsLeft === 0 ? 'Complete 完成' : 'Complete Early 提前完成'}
          onPress={completeWithReward}
          textColor="#183826"
        />
        <SceneButton backgroundColor="#EEF4E9" label="Back 返回" onPress={onBack} textColor="#35503A" />
      </View>
    </View>
  );
}

export default CoffeeScene;
