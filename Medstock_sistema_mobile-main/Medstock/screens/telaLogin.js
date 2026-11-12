import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  navy: '#1B3A5C',
  ocean: '#2A6B96',
  teal: '#2FA8B5',
  cyan: '#5FD3DC',
  light: '#EEF5FA',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.7)',
};

// ==========================================================
// ENDEREÇO DA API
// ==========================================================

// COLOQUE AQUI O IP DO COMPUTADOR ONDE O FLASK ESTÁ RODANDO
const API_URL = 'http://10.0.2.2:5000';

export default function telaLogin({ navigation }) {

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleEntrar = async () => {

    // Remove espaços desnecessários
    const emailDigitado = email.trim();
    const senhaDigitada = senha;

    // ========================================================
    // VALIDAÇÃO
    // ========================================================

    if (!emailDigitado) {
      Alert.alert(
        'Atenção',
        'Digite seu email.'
      );
      return;
    }

    if (!senhaDigitada) {
      Alert.alert(
        'Atenção',
        'Digite sua senha.'
      );
      return;
    }

    setCarregando(true);

    try {

      console.log('=================================');
      console.log('TENTANDO FAZER LOGIN');
      console.log('Email:', emailDigitado);
      console.log('API:', `${API_URL}/api/cliente/login`);
      console.log('=================================');

      // ======================================================
      // ENVIA LOGIN PARA O FLASK
      // ======================================================

      const resposta = await fetch(
        `${API_URL}/api/cliente/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },

          body: JSON.stringify({
            email: emailDigitado,
            senha: senhaDigitada,
          }),
        }
      );

      // ======================================================
      // CONVERTE RESPOSTA
      // ======================================================

      const dados = await resposta.json();

      console.log('Resposta da API:', dados);

      // ======================================================
      // LOGIN CORRETO
      // ======================================================

      if (resposta.ok && dados.sucesso) {

        console.log('LOGIN REALIZADO COM SUCESSO');
        console.log('Cliente:', dados.cliente);

        navigation.navigate('Sistema', {
          cliente: dados.cliente,
          usuario: dados.cliente,
          user: dados.cliente,
        });

        return;
      }

      // ======================================================
      // LOGIN INCORRETO
      // ======================================================

      Alert.alert(
        'Login inválido',
        dados.erro || 'Email ou senha inválidos.'
      );

    } catch (erro) {

      console.log('=================================');
      console.log('ERRO AO FAZER LOGIN');
      console.log(erro);
      console.log('=================================');

      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o computador e o celular estão na mesma rede Wi-Fi e se o Flask está funcionando.'
      );

    } finally {

      setCarregando(false);

    }
  };

  // ==========================================================
  // TELA
  // ==========================================================

  return (
    <LinearGradient
      colors={[
        COLORS.navy,
        COLORS.ocean,
        COLORS.teal
      ]}
      start={{
        x: 0,
        y: 0
      }}
      end={{
        x: 1,
        y: 1
      }}
      style={styles.fill}
    >

      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ==================================================
              LOGO
          ================================================== */}

          <View style={styles.brand}>

            <Image
              source={require('../assets/MedStock.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <Text style={styles.subtitle}>
              Sistema de Controle de Estoque
            </Text>

          </View>

          {/* ==================================================
              CARTÃO DE LOGIN
          ================================================== */}

          <View style={styles.card}>

            <Text style={styles.cardTitle}>
              Acessar conta
            </Text>

            <Text style={styles.cardSubtitle}>
              Entre com suas credenciais para continuar
            </Text>

            {/* ==================================================
                E-MAIL
            ================================================== */}

            <Text style={styles.label}>
              E-mail
            </Text>

            <View style={styles.inputWrap}>

              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#9AAFC0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!carregando}
                returnKeyType="next"
              />

            </View>

            {/* ==================================================
                SENHA
            ================================================== */}

            <Text style={styles.label}>
              Senha
            </Text>

            <View style={styles.inputWrap}>

              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9AAFC0"
                secureTextEntry={!mostrarSenha}
                autoCapitalize="none"
                autoCorrect={false}
                value={senha}
                onChangeText={setSenha}
                editable={!carregando}
                returnKeyType="go"
                onSubmitEditing={handleEntrar}
              />

              <TouchableOpacity
                onPress={() =>
                  setMostrarSenha(
                    (valor) => !valor
                  )
                }
                disabled={carregando}
                hitSlop={{
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                }}
              >

                <Text style={styles.toggle}>
                  {mostrarSenha
                    ? 'Ocultar'
                    : 'Mostrar'
                  }
                </Text>

              </TouchableOpacity>

            </View>

            {/* ==================================================
                BOTÃO ENTRAR
            ================================================== */}

            <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleEntrar}
            disabled={carregando}
            style={[
            styles.buttonShadow,
            {
              marginTop: 20,
            },
  ]}
>

              <LinearGradient
                colors={[
                  COLORS.teal,
                  COLORS.ocean
                ]}
                start={{
                  x: 0,
                  y: 0
                }}
                end={{
                  x: 1,
                  y: 0
                }}
                style={[
                  styles.button,
                  carregando &&
                  styles.buttonDisabled,
                ]}
              >

                {carregando ? (

                  <View style={styles.loadingContainer}>

                    <ActivityIndicator
                      color={COLORS.white}
                      size="small"
                    />

                    <Text style={styles.loadingText}>
                      Entrando...
                    </Text>

                  </View>

                ) : (

                  <Text style={styles.buttonText}>
                    Entrar
                  </Text>

                )}

              </LinearGradient>

            </TouchableOpacity>

          </View>

          {/* ==================================================
              RODAPÉ
          ================================================== */}

          <Text style={styles.footer}>
            © {new Date().getFullYear()} MedStock · Versão 1.0.0
          </Text>

        </ScrollView>

      </KeyboardAvoidingView>

    </LinearGradient>
  );
}

// ==========================================================
// ESTILOS
// ==========================================================

const styles = StyleSheet.create({

  fill: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // ========================================================
  // LOGO
  // ========================================================

  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },

  // ========================================================
  // CARTÃO
  // ========================================================

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,

    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,

    shadowOffset: {
      width: 0,
      height: 12,
    },

    elevation: 8,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
  },

  cardSubtitle: {
    fontSize: 13,
    color: '#6B8299',
    marginTop: 4,
    marginBottom: 20,
  },

  // ========================================================
  // LABEL
  // ========================================================

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 6,
    marginTop: 12,
  },

  // ========================================================
  // INPUT
  // ========================================================

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: COLORS.light,

    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE8F0',

    paddingHorizontal: 14,
    height: 52,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.navy,
    paddingVertical: 0,
  },

  toggle: {
    color: COLORS.ocean,
    fontSize: 13,
    fontWeight: '600',
  },

  // ========================================================
  // BOTÃO
  // ========================================================

  buttonShadow: {
    borderRadius: 14,

    shadowColor: COLORS.teal,
    shadowOpacity: 0.4,
    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
  },

  button: {
    height: 54,
    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ========================================================
  // LOADING
  // ========================================================

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },

  // ========================================================
  // RODAPÉ
  // ========================================================

  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 28,
  },

});