import React, { useEffect, useRef, useState } from 'react';

import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  Platform,
  Dimensions,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// ============================================================
// TELAS
// ============================================================

import telaLogin from './screens/telaLogin';
import telaHome from './screens/telaHome';
import telaDashboard from './screens/telaDashboard';
import telamov from './screens/telamov';
import telaScanner from './screens/telaScanner';
import telaPerfil from './screens/telaPerfil';

// ============================================================
// NAVEGADORES
// ============================================================

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================================
// CORES MEDSTOCK
// ============================================================

const C = {
  white: '#FFFFFF',
  deep: '#123A73',
  teal: '#008F95',
  muted: '#8A98AB',
  border: '#E6ECF3',
  activeBg: '#00bec421',
};

// ============================================================
// ÍCONES
// ============================================================

const ICONES = {
  Home: {
    ativo: 'home',
    inativo: 'home-outline',
  },

  Dashboard: {
    ativo: 'view-dashboard',
    inativo: 'view-dashboard-outline',
  },

  Escanear: {
    ativo: 'barcode-scan',
    inativo: 'barcode-scan',
  },

  Movimentação: {
    ativo: 'swap-horizontal-bold',
    inativo: 'swap-horizontal',
  },

  Perfil: {
    ativo: 'account-circle',
    inativo: 'account-circle-outline',
  },
};

// ============================================================
// MEDIDAS
// ============================================================

const BAR_PADDING_H = 6; // mesmo valor de styles.bar.paddingHorizontal
const PILL_WIDTH = 88;
const PILL_HEIGHT = 46;

const LARGURA_TELA = Dimensions.get('window').width;

// ============================================================
// ANIMAÇÃO DE TRANSIÇÃO ENTRE AS TELAS (ABAS)
// ============================================================

// Timing com curva de desaceleração: começa rápido e termina suave
const transicaoMola = {
  animation: 'timing',
  config: {
    duration: 320,
    easing: Easing.out(Easing.cubic),
  },
};

// progress: -1 = tela à esquerda, 0 = tela ativa, 1 = tela à direita
const estiloDaCena = ({ current }) => ({
  sceneStyle: {
    // As duas telas ficam parcialmente visíveis ao mesmo tempo,
    // evitando o "vazio" no meio da transição
    opacity: current.progress.interpolate({
      inputRange: [-1, -0.5, 0, 0.5, 1],
      outputRange: [0, 0.75, 1, 0.75, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-LARGURA_TELA * 0.25, 0, LARGURA_TELA * 0.25],
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.98, 1, 0.98],
        }),
      },
    ],
  },
});

// ============================================================
// ITEM DA BARRA
// ============================================================

function TabItem({ label, iconName, focused, onPress, onLongPress }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[styles.iconWrap, { transform: [{ scale }] }]}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={25}
          color={focused ? C.deep : C.muted}
        />
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// BOTÃO CENTRAL - SCANNER
// ============================================================

function ScannerButton({ label, focused, onPress, onLongPress }) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  }, [focused, anim]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.scannerPressable}
    >
      <Animated.View
        style={[styles.scannerBtn, { transform: [{ scale }] }]}
      >
        <MaterialCommunityIcons
          name="barcode-scan"
          size={28}
          color={C.white}
        />
      </Animated.View>
    </Pressable>
  );
}

// ============================================================
// BARRA INFERIOR COM BLUR + PÍLULA DESLIZANTE
// ============================================================

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  // Largura interna da barra (medida em tempo de execução)
  const [barWidth, setBarWidth] = useState(0);

  const total = state.routes.length;
  const slotWidth =
    barWidth > 0 ? (barWidth - BAR_PADDING_H * 2) / total : 0;

  // Posição X da pílula para um índice
  const posicaoDoIndice = (index) =>
    BAR_PADDING_H + slotWidth * index + (slotWidth - PILL_WIDTH) / 2;

  const rotaScanner = state.routes.find(
    (route) => route.name === 'Escanear'
  );

  const scannerFocused =
    rotaScanner &&
    state.routes[state.index].key === rotaScanner.key;

  // Valores animados da pílula
  const pillX = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(1)).current;
  const pillScaleX = useRef(new Animated.Value(1)).current;

  const primeiraVez = useRef(true);
  const vinhaDoScanner = useRef(false);

  useEffect(() => {
    if (slotWidth === 0) return;

    const alvo = posicaoDoIndice(state.index);

    if (primeiraVez.current) {
      // Primeira medição: posiciona sem animar
      pillX.setValue(alvo);
      primeiraVez.current = false;
    } else if (scannerFocused) {
      // Scanner ativo: a pílula só some, não se move
    } else if (vinhaDoScanner.current) {
      // Voltando do Scanner: aparece direto no destino
      pillX.setValue(alvo);
    } else {
      // Deslize com mola macia + leve esticada durante o movimento
      Animated.parallel([
        Animated.spring(pillX, {
          toValue: alvo,
          stiffness: 170,
          damping: 17,
          mass: 0.9,
          useNativeDriver: true,
        }),

        Animated.sequence([
          Animated.timing(pillScaleX, {
            toValue: 1.2,
            duration: 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(pillScaleX, {
            toValue: 1,
            stiffness: 200,
            damping: 14,
            mass: 0.8,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }

    // Some/aparece suavemente conforme o Scanner
    Animated.timing(pillOpacity, {
      toValue: scannerFocused ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    vinhaDoScanner.current = !!scannerFocused;
  }, [state.index, slotWidth, scannerFocused]);

  const criarHandlers = (route, focused) => ({
    onPress: () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => {}
        );

        navigation.navigate(route.name, route.params);
      }
    },

    onLongPress: () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    },
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {/* FUNDO DESFOCADO */}
      <BlurView
        intensity={70}
        tint="light"
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : 'none'
        }
        style={styles.barBlur}
      >
        {/* CONTEÚDO DA BARRA */}
        <View
          style={styles.bar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* PÍLULA QUE DESLIZA */}
          {slotWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingPill,
                {
                  opacity: pillOpacity,
                  transform: [
                    { translateX: pillX },
                    { scaleX: pillScaleX },
                  ],
                },
              ]}
            />
          ) : null}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;

            // Espaço reservado para o scanner central
            if (route.name === 'Escanear') {
              return <View key={route.key} style={styles.item} />;
            }

            const icones = ICONES[route.name] || ICONES.Home;

            const { onPress, onLongPress } = criarHandlers(
              route,
              focused
            );

            return (
              <TabItem
                key={route.key}
                label={options.title || route.name}
                iconName={focused ? icones.ativo : icones.inativo}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </BlurView>

      {/* BOTÃO CENTRAL FORA DO BLUR */}
      {rotaScanner ? (
        <View pointerEvents="box-none" style={styles.scannerLayer}>
          <ScannerButton
            label={
              descriptors[rotaScanner.key].options.title || 'Escanear'
            }
            focused={!!scannerFocused}
            {...criarHandlers(rotaScanner, !!scannerFocused)}
          />
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// ABAS
// ============================================================

function BottomTabs({ route }) {
  const cliente =
    route?.params?.cliente ||
    route?.params?.usuario ||
    route?.params?.user ||
    null;

  const paramsIniciais = {
    cliente,
    usuario: cliente,
    user: cliente,
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        // Transição lateral suave com fade e zoom leve
        transitionSpec: transicaoMola,
        sceneStyleInterpolator: estiloDaCena,

        // Evita "piscar" branco durante a troca
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={telaHome}
        initialParams={paramsIniciais}
        options={{ title: 'Início', lazy: false }}
      />

      <Tab.Screen
        name="Dashboard"
        component={telaDashboard}
        initialParams={paramsIniciais}
        options={{ title: 'Dashboard', lazy: false }}
      />

      {/* Scanner continua lazy para a câmera não abrir sozinha */}
      <Tab.Screen
        name="Escanear"
        component={telaScanner}
        initialParams={paramsIniciais}
        options={{ title: 'Escanear' }}
      />

      <Tab.Screen
        name="Movimentação"
        component={telamov}
        initialParams={paramsIniciais}
        options={{ title: 'Movimentos', lazy: false }}
      />

      <Tab.Screen
        name="Perfil"
        component={telaPerfil}
        initialParams={paramsIniciais}
        options={{ title: 'Perfil', lazy: false }}
      />
    </Tab.Navigator>
  );
}

// ============================================================
// APLICAÇÃO PRINCIPAL
// ============================================================

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      >
        <Stack.Screen name="Login" component={telaLogin} />

        <Stack.Screen
          name="Sistema"
          component={BottomTabs}
          options={{
            // Entrada suave no app depois do login
            animation: 'fade_from_bottom',
            animationDuration: 400,

            // Impede voltar para o Login com gesto
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
  // Área externa da barra
  wrapper: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 5,
    paddingTop: 20,
    paddingHorizontal: 16,
  },

  // Camada que efetivamente aplica o desfoque
  barBlur: {
    height: 70,
    borderRadius: 30,
    overflow: 'hidden',

    // Fundo translúcido: não pode ser branco opaco
    backgroundColor: 'rgba(255, 255, 255, 0.16)',

    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.75)',

    // Sombra
    shadowColor: C.deep,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 8,
  },

  // Conteúdo transparente sobre o BlurView
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: BAR_PADDING_H,
    backgroundColor: 'transparent',
  },

  // Pílula que desliza entre as abas
  slidingPill: {
    position: 'absolute',
    left: 0,
    top: (70 - PILL_HEIGHT) / 2,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 22,
    backgroundColor: C.activeBg,
  },

  // Área de cada ícone
  item: {
    flex: 1,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Wrapper do ícone (só para a animação de escala)
  iconWrap: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Camada do scanner central
  scannerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  scannerPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Botão do scanner
  scannerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 4,
    borderColor: C.white,

    shadowColor: C.teal,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 10,
  },
});
//app