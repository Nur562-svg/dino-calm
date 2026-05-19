import { Text, View } from 'react-native';

export type DinoState = 'calm' | 'happy' | 'grumpy' | 'healing';

type DinoAvatarProps = {
  accessories?: string[];
  state: DinoState;
  size?: number;
};

const palette = {
  body: '#BDEB95',
  belly: '#FFF0AE',
  outline: '#6EA154',
  cheek: '#FFB3A7',
  cloud: '#9EA6BF',
  spark: '#FFD65A',
  flower: '#FFA6C9',
  flame: '#FF8B5E',
};

export function DinoAvatar({ accessories = [], state, size = 220 }: DinoAvatarProps) {
  const headSize = size * 0.72;
  const bodyWidth = size * 0.54;
  const bodyHeight = size * 0.44;
  const eyeSize = size * 0.075;
  const mouthWidth = size * 0.14;
  const mouthHeight = size * 0.05;
  const hasScarf = accessories.includes('Scarf');
  const hasFlower = accessories.includes('Flower');
  const hasStar = accessories.includes('Star');
  const hasCrown = accessories.includes('Crown');

  const expression = {
    calm: {
      leftEye: '•',
      rightEye: '•',
      mouth: '﹀',
      extra: null,
    },
    happy: {
      leftEye: '◠',
      rightEye: '◠',
      mouth: 'ᴗ',
      extra: (
        <>
          <Text
            style={{
              position: 'absolute',
              left: size * 0.05,
              top: size * 0.08,
              fontSize: size * 0.11,
            }}
          >
            ✦
          </Text>
          <Text
            style={{
              position: 'absolute',
              right: size * 0.06,
              top: size * 0.18,
              fontSize: size * 0.1,
            }}
          >
            ✿
          </Text>
          <Text
            style={{
              position: 'absolute',
              right: size * 0.14,
              top: size * 0.06,
              fontSize: size * 0.08,
            }}
          >
            ✦
          </Text>
        </>
      ),
    },
    grumpy: {
      leftEye: '•',
      rightEye: '•',
      mouth: '︵',
      extra: (
        <>
          <View
            style={{
              position: 'absolute',
              left: size * 0.06,
              top: size * 0.04,
              width: size * 0.22,
              height: size * 0.1,
              borderRadius: 999,
              backgroundColor: palette.cloud,
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 6px 16px rgba(80, 88, 122, 0.18)',
            }}
          >
            <View
              style={{
                position: 'absolute',
                right: size * 0.02,
                bottom: -size * 0.025,
                width: size * 0.05,
                height: size * 0.05,
                borderRadius: 999,
                backgroundColor: palette.cloud,
              }}
            />
          </View>
          <Text
            style={{
              position: 'absolute',
              right: size * 0.07,
              top: size * 0.07,
              fontSize: size * 0.1,
            }}
          >
            🔥
          </Text>
        </>
      ),
    },
    healing: {
      leftEye: '˘',
      rightEye: '˘',
      mouth: '◡',
      extra: (
        <>
          <Text
            style={{
              position: 'absolute',
              left: size * 0.02,
              top: size * 0.08,
              fontSize: size * 0.11,
            }}
          >
            ☁
          </Text>
          <Text
            style={{
              position: 'absolute',
              right: size * 0.02,
              top: size * 0.1,
              fontSize: size * 0.11,
            }}
          >
            ○
          </Text>
        </>
      ),
    },
  }[state];

  return (
    <View
      style={{
        width: size,
        height: size * 1.08,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      {expression.extra}

      {hasCrown ? (
        <Text
          style={{
            position: 'absolute',
            top: size * 0.08,
            fontSize: size * 0.11,
            zIndex: 3,
          }}
        >
          👑
        </Text>
      ) : null}

      {hasStar ? (
        <Text
          style={{
            position: 'absolute',
            right: size * 0.08,
            top: size * 0.3,
            fontSize: size * 0.08,
            zIndex: 2,
          }}
        >
          ⭐
        </Text>
      ) : null}

      {hasFlower ? (
        <Text
          style={{
            position: 'absolute',
            left: size * 0.14,
            top: size * 0.24,
            fontSize: size * 0.085,
            zIndex: 2,
          }}
        >
          🌸
        </Text>
      ) : null}

      <View
        style={{
          position: 'absolute',
          top: size * 0.15,
          right: size * 0.13,
          gap: size * 0.015,
        }}
      >
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: size * 0.055,
              borderRightWidth: size * 0.055,
              borderBottomWidth: size * 0.12,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: '#8ACB62',
              transform: [{ rotate: `${20 + index * 5}deg` }],
              marginTop: index === 1 ? -size * 0.02 : 0,
            }}
          />
        ))}
      </View>

      <View
        style={{
          width: headSize,
          height: headSize * (state === 'grumpy' ? 0.95 : 0.9),
          borderRadius: headSize * 0.42,
          backgroundColor: palette.body,
          borderWidth: 3,
          borderColor: palette.outline,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 16px 28px rgba(95, 140, 83, 0.18)',
        }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: headSize * 0.07,
            width: headSize * 0.5,
            height: headSize * 0.24,
            borderRadius: 999,
            backgroundColor: palette.belly,
            opacity: 0.85,
          }}
        />

        <View
          style={{
            position: 'absolute',
            top: headSize * 0.16,
            left: headSize * 0.16,
            width: headSize * 0.18,
            height: headSize * 0.12,
            borderRadius: 999,
            backgroundColor: palette.body,
            borderWidth: 3,
            borderColor: palette.outline,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: headSize * 0.16,
            right: headSize * 0.16,
            width: headSize * 0.18,
            height: headSize * 0.12,
            borderRadius: 999,
            backgroundColor: palette.body,
            borderWidth: 3,
            borderColor: palette.outline,
          }}
        />

        {state === 'grumpy' ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: headSize * 0.245,
                top: headSize * 0.29,
                width: headSize * 0.13,
                height: 5,
                borderRadius: 999,
                backgroundColor: '#4A5E3B',
                transform: [{ rotate: '-24deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: headSize * 0.245,
                top: headSize * 0.29,
                width: headSize * 0.13,
                height: 5,
                borderRadius: 999,
                backgroundColor: '#4A5E3B',
                transform: [{ rotate: '24deg' }],
              }}
            />
          </>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: headSize * 0.34,
            marginTop: headSize * 0.04,
          }}
        >
          <Text style={{ fontSize: eyeSize, lineHeight: eyeSize }}>{expression.leftEye}</Text>
          <Text style={{ fontSize: eyeSize, lineHeight: eyeSize }}>{expression.rightEye}</Text>
        </View>

        {state === 'grumpy' ? (
          <>
            <View
              style={{
                position: 'absolute',
                left: headSize * 0.11,
                bottom: headSize * 0.22,
                width: headSize * 0.15,
                height: headSize * 0.11,
                borderRadius: 999,
                backgroundColor: palette.cheek,
              }}
            />
            <View
              style={{
                position: 'absolute',
                right: headSize * 0.11,
                bottom: headSize * 0.22,
                width: headSize * 0.15,
                height: headSize * 0.11,
                borderRadius: 999,
                backgroundColor: palette.cheek,
              }}
            />
          </>
        ) : null}

        <View
          style={{
            marginTop: headSize * 0.06,
            width: mouthWidth,
            minHeight: mouthHeight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.1, lineHeight: size * 0.1 }}>{expression.mouth}</Text>
        </View>
      </View>

      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          marginTop: -size * 0.08,
          borderRadius: bodyWidth * 0.38,
          backgroundColor: palette.body,
          borderWidth: 3,
          borderColor: palette.outline,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: size * 0.06,
        }}
      >
        <View
          style={{
            width: bodyWidth * 0.52,
            height: bodyHeight * 0.55,
            borderRadius: 999,
            backgroundColor: palette.belly,
          }}
        />

        <View
          style={{
            position: 'absolute',
            left: -size * 0.03,
            top: bodyHeight * 0.2,
            width: size * 0.11,
            height: size * 0.06,
            borderRadius: 999,
            backgroundColor: palette.body,
            borderWidth: 3,
            borderColor: palette.outline,
            transform: [{ rotate: '-22deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: -size * 0.03,
            top: bodyHeight * 0.2,
            width: size * 0.11,
            height: size * 0.06,
            borderRadius: 999,
            backgroundColor: palette.body,
            borderWidth: 3,
            borderColor: palette.outline,
          transform: [{ rotate: '22deg' }],
        }}
      />

      {hasScarf ? (
        <View
          style={{
            position: 'absolute',
            top: size * 0.63,
            left: size * 0.37,
            width: size * 0.24,
            height: size * 0.065,
            borderRadius: 999,
            backgroundColor: '#E86F8F',
            borderWidth: 2,
            borderColor: '#B95771',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            transform: [{ rotate: '-3deg' }],
          }}
        >
          <Text style={{ fontSize: size * 0.038 }}>🧣</Text>
          <View
            style={{
              position: 'absolute',
              right: size * 0.035,
              top: size * 0.028,
              width: size * 0.05,
              height: size * 0.09,
              borderRadius: 999,
              backgroundColor: '#E86F8F',
              borderWidth: 2,
              borderColor: '#B95771',
              transform: [{ rotate: '10deg' }],
            }}
          />
        </View>
      ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: size * 0.1,
          marginTop: -size * 0.015,
        }}
      >
        {[0, 1].map((leg) => (
          <View
            key={leg}
            style={{
              width: size * 0.12,
              height: size * 0.075,
              borderRadius: 999,
              backgroundColor: palette.body,
              borderWidth: 3,
              borderColor: palette.outline,
            }}
          />
        ))}
      </View>

      <View
        style={{
          position: 'absolute',
          left: size * 0.02,
          bottom: size * 0.08,
          width: size * 0.34,
          height: size * 0.11,
          borderRadius: 999,
          backgroundColor: '#C3E69F',
          borderWidth: 3,
          borderColor: palette.outline,
          transform: [{ rotate: '20deg' }],
          zIndex: -1,
        }}
      />
    </View>
  );
}
