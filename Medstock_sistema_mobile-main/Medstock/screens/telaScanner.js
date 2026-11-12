import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Vibration,
  Animated,
  Easing,
  Modal,
} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import {
  buscarProdutoPorCodigo,
  cadastrarProduto,
  buscarFornecedores,
} from '../services/api';


// ============================================================
// CORES (mesmas do app)   ·   npx expo install expo-camera
// ============================================================

const C = {
  bg: '#F5F8FA',
  card: '#FFFFFF',
  border: '#E6ECF1',
  deep: '#123A73',
  brand: '#12B5B0',
  text: '#1B2A41',
  muted: '#7B8AA0',
  white: '#FFFFFF',
  green: '#22A55B',
  red: '#EF4444',
  warn: '#E0A020',
  warnBg: '#FFF6E5',
};


// ============================================================
// CONFIGURAÇÕES
// ============================================================

// Margem padrão aplicada sobre o preço de custo
const MARGEM_PADRAO = 0.6;

// A coluna produto.codigo_barras é VARCHAR(14)
const CODIGO_MAX = 14;

const TIPOS_CODIGO = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'datamatrix',
];

// Mesmos valores do ENUM tipo_medicamento do banco
const TIPOS_MEDICAMENTO = [
  { chave: 'referencia', rotulo: 'Referência' },
  { chave: 'generico', rotulo: 'Genérico' },
  { chave: 'similar', rotulo: 'Similar' },
  { chave: 'biologico', rotulo: 'Biológico' },
  { chave: 'fitoterapico', rotulo: 'Fitoterápico' },
  { chave: 'outros', rotulo: 'Outros' },
];

// Categorias permitidas (mesma lista do sistema web)
const CATEGORIAS = [
  'Analgésicos',
  'Anti-inflamatórios',
  'Antibióticos',
  'Antialérgicos',
  'Antifúngicos e Antivirais',
  'Gastrointestinais',
  'Cardiovasculares',
  'Anti-hipertensivos',
  'Antidiabéticos',
  'Respiratórios',
  'Dermatológicos',
  'Corticoides',
  'Psiquiatria e Neurologia',
  'Medicamentos Controlados',
  'Ginecologia e Saúde da Mulher',
  'Oftalmológicos e Otológicos',
  'Endocrinologia',
  'Fitoterápicos',
  'Vacinas',
  'Vitaminas e Suplementos',
  'Higiene e Cuidados Pessoais',
  'Dermocosméticos',
  'Infantil e Bebês',
  'Materiais Hospitalares',
  'First Aid e Curativos',
  'EPIs',
  'Outros',
];

const FORM_VAZIO = {
  codigo_barras: '',
  nome: '',
  marca: '',
  categoria: '',
  tipo_medicamento: 'outros',
  quantidade: '',
  estoque_minimo: '',
  validade: '',
  preco_custo: '',
  preco_venda: '',
};


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

// "1.234,50" ou "12.50" → número
const paraNumero = (texto) => {
  const t = String(texto ?? '').trim();

  if (!t) return 0;

  const normalizado = t.includes(',')
    ? t.replace(/\./g, '').replace(',', '.')
    : t;

  const n = Number(normalizado);

  return Number.isNaN(n) ? 0 : n;
};

const formatarMoeda = (n) =>
  Number(n || 0).toFixed(2).replace('.', ',');

// 25122026 → 25/12/2026
const mascaraData = (texto) => {
  const d = String(texto).replace(/\D/g, '').slice(0, 8);

  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;

  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

// 25/12/2026 → 2026-12-25 (ou null se inválida)
const dataParaISO = (texto) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);

  if (!m) return null;

  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);

  const dt = new Date(ano, mes - 1, dia);

  if (
    dt.getFullYear() !== ano ||
    dt.getMonth() !== mes - 1 ||
    dt.getDate() !== dia
  ) {
    return null;
  }

  return `${m[3]}-${m[2]}-${m[1]}`;
};

// Normaliza o que a câmera leu para algo que caiba no banco.
// - DataMatrix GS1 de medicamentos ("01" + GTIN-14 + ...) → extrai o GTIN
// - GTIN-14 começando com 0 → vira EAN-13 (como costuma ser cadastrado)
// - Só aceita números de 8 a 14 dígitos; senão retorna null
const normalizarCodigo = (bruto) => {
  let c = String(bruto || '').trim();

  const gs1 = /^01(\d{14})/.exec(c);
  if (gs1) c = gs1[1];

  if (!/^\d+$/.test(c)) return null;

  if (c.length === 14 && c.startsWith('0')) c = c.slice(1);

  if (c.length < 8 || c.length > CODIGO_MAX) return null;

  return c;
};


// ============================================================
// CAMPO DE TEXTO REUTILIZÁVEL
// ============================================================

function Campo({
  label,
  obrigatorio,
  style,
  ...props
}) {
  return (
    <View style={[styles.campo, style]}>
      <Text style={styles.campoLabel}>
        {label}
        {obrigatorio ? <Text style={{ color: C.red }}> *</Text> : null}
      </Text>

      <TextInput
        style={styles.campoInput}
        placeholderTextColor="#A5B0C0"
        {...props}
      />
    </View>
  );
}


// ============================================================
// TELA
// ============================================================

export default function TelaScanner({ navigation }) {

  const focada = useIsFocused();

  const [permissao, pedirPermissao] = useCameraPermissions();

  // 'scan' | 'form' | 'existente' | 'sucesso'
  const [etapa, setEtapa] = useState('scan');

  const [lanterna, setLanterna] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [manualAberto, setManualAberto] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');

  const [form, setForm] = useState(FORM_VAZIO);
  const [vendaManual, setVendaManual] = useState(false);

  const [existente, setExistente] = useState(null);
  const [nomeSalvo, setNomeSalvo] = useState('');

  // Fornecedor (obrigatório no banco). Fica fora do form para
  // continuar selecionado ao cadastrar vários produtos seguidos.
  const [fornecedores, setFornecedores] = useState([]);
  const [carregandoForn, setCarregandoForn] = useState(false);
  const [erroForn, setErroForn] = useState('');
  const [fornecedorId, setFornecedorId] = useState(null);
  const [fornModal, setFornModal] = useState(false);

  // Modal de categoria
  const [catModal, setCatModal] = useState(false);

  // Evita ler o mesmo código várias vezes seguidas
  const travado = useRef(false);

  // Linha animada do leitor
  const linha = useRef(new Animated.Value(0)).current;


  // ----------------------------------------------------------
  // ANIMAÇÃO DA LINHA DO SCANNER
  // ----------------------------------------------------------

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(linha, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(linha, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();

    return () => anim.stop();
  }, [linha]);


  // Desliga a lanterna ao sair da aba
  useEffect(() => {
    if (!focada) setLanterna(false);
  }, [focada]);


  // ----------------------------------------------------------
  // FORNECEDORES
  // ----------------------------------------------------------

  const carregarFornecedores = useCallback(async () => {
    setCarregandoForn(true);
    setErroForn('');

    try {
      const lista = await buscarFornecedores();
      setFornecedores(lista);
    } catch (erro) {
      setErroForn(erro.message);
    } finally {
      setCarregandoForn(false);
    }
  }, []);

  useEffect(() => {
    carregarFornecedores();
  }, [carregarFornecedores]);

  const fornecedorAtual = fornecedores.find((f) => f.id === fornecedorId);


  // ----------------------------------------------------------
  // FORMULÁRIO
  // ----------------------------------------------------------

  const setCampo = (chave, valor) =>
    setForm((f) => ({ ...f, [chave]: valor }));

  const aoMudarCusto = (texto) => {
    setForm((f) => {
      const novo = { ...f, preco_custo: texto };

      if (!vendaManual) {
        const custo = paraNumero(texto);

        novo.preco_venda =
          custo > 0
            ? formatarMoeda(custo * (1 + MARGEM_PADRAO))
            : '';
      }

      return novo;
    });
  };

  const aoMudarVenda = (texto) => {
    setVendaManual(texto.trim().length > 0);
    setCampo('preco_venda', texto);
  };

  const recalcularVenda = () => {
    const custo = paraNumero(form.preco_custo);

    setVendaManual(false);

    setCampo(
      'preco_venda',
      custo > 0
        ? formatarMoeda(custo * (1 + MARGEM_PADRAO))
        : ''
    );
  };

  const custoNum = paraNumero(form.preco_custo);
  const vendaNum = paraNumero(form.preco_venda);

  const margemAtual =
    custoNum > 0
      ? ((vendaNum - custoNum) / custoNum) * 100
      : null;


  // ----------------------------------------------------------
  // REINICIAR LEITURA
  // ----------------------------------------------------------

  const reiniciar = useCallback(() => {
    setForm(FORM_VAZIO);
    setVendaManual(false);
    setExistente(null);
    setCodigoManual('');
    setManualAberto(false);
    setConsultando(false);
    setCatModal(false);
    setFornModal(false);
    travado.current = false;
    setEtapa('scan');
  }, []);


  // ----------------------------------------------------------
  // PROCESSAR CÓDIGO (lido ou digitado)
  // ----------------------------------------------------------

  const processarCodigo = useCallback(async (codigo) => {

    setConsultando(true);

    try {

      const produto = await buscarProdutoPorCodigo(codigo);

      if (produto) {
        setExistente({ ...produto, codigo_barras: codigo });
        setEtapa('existente');
      } else {
        setForm({ ...FORM_VAZIO, codigo_barras: codigo });
        setVendaManual(false);
        setEtapa('form');
      }

    } catch (erro) {

      Alert.alert(
        'Não foi possível consultar o sistema',
        `${erro.message}\n\nDeseja continuar o cadastro mesmo assim?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              travado.current = false;
            },
          },
          {
            text: 'Continuar',
            onPress: () => {
              setForm({ ...FORM_VAZIO, codigo_barras: codigo });
              setVendaManual(false);
              setEtapa('form');
            },
          },
        ],
        { cancelable: false }
      );

    } finally {
      setConsultando(false);
    }

  }, []);


  const aoLerCodigo = useCallback(({ data }) => {

    if (travado.current) return;

    travado.current = true;

    const codigo = normalizarCodigo(data);

    if (!codigo) {
      Vibration.vibrate(200);

      Alert.alert(
        'Código não reconhecido',
        `O código lido não é um código de barras numérico de 8 a ${CODIGO_MAX} dígitos. Tente novamente ou digite manualmente.`,
        [{ text: 'OK', onPress: () => { travado.current = false; } }],
        { cancelable: false }
      );

      return;
    }

    Vibration.vibrate(70);

    processarCodigo(codigo);

  }, [processarCodigo]);


  const usarCodigoManual = () => {

    const codigo = normalizarCodigo(codigoManual);

    if (!codigo) {
      Alert.alert(
        'Código inválido',
        `Digite o código de barras completo (somente números, de 8 a ${CODIGO_MAX} dígitos).`
      );
      return;
    }

    if (travado.current) return;

    travado.current = true;

    setManualAberto(false);

    processarCodigo(codigo);

  };


  // ----------------------------------------------------------
  // SALVAR
  // ----------------------------------------------------------

  const salvar = async () => {

    if (salvando) return;

    const nome = form.nome.trim();
    const categoria = form.categoria;

    if (!nome) {
      Alert.alert('Campo obrigatório', 'Informe o nome do produto.');
      return;
    }

    if (!fornecedorId) {
      Alert.alert('Campo obrigatório', 'Selecione o fornecedor.');
      return;
    }

    if (!categoria) {
      Alert.alert('Campo obrigatório', 'Selecione a categoria.');
      return;
    }

    // Garante que o valor está dentro da lista permitida
    if (!CATEGORIAS.includes(categoria)) {
      Alert.alert('Categoria inválida', 'Selecione uma categoria da lista.');
      return;
    }

    if (form.quantidade === '') {
      Alert.alert('Campo obrigatório', 'Informe a quantidade em estoque.');
      return;
    }

    if (custoNum <= 0) {
      Alert.alert('Campo obrigatório', 'Informe o preço de custo.');
      return;
    }

    if (vendaNum <= 0) {
      Alert.alert('Campo obrigatório', 'Informe o preço de venda.');
      return;
    }

    if (form.codigo_barras && form.codigo_barras.length < 8) {
      Alert.alert('Código inválido', 'O código de barras deve ter de 8 a 14 dígitos (ou deixe em branco).');
      return;
    }

    let validadeISO = null;

    if (form.validade.trim()) {
      validadeISO = dataParaISO(form.validade.trim());

      if (!validadeISO) {
        Alert.alert('Validade inválida', 'Use o formato DD/MM/AAAA.');
        return;
      }
    }

    // Nomes iguais às colunas da tabela "produto"
    const payload = {
      fornecedor_id: fornecedorId,
      nome,
      codigo_barras: form.codigo_barras || null,
      marca: form.marca.trim() || null,
      categoria,
      tipo_medicamento: form.tipo_medicamento,
      quantidade_estoque: parseInt(form.quantidade, 10) || 0,
      estoque_minimo: parseInt(form.estoque_minimo, 10) || 0,
      preco_custo: custoNum,
      preco_venda: vendaNum,
      data_validade: validadeISO,
    };

    setSalvando(true);

    try {

      await cadastrarProduto(payload);

      setNomeSalvo(nome);
      setEtapa('sucesso');

    } catch (erro) {

      Alert.alert('Erro ao cadastrar', erro.message);

    } finally {
      setSalvando(false);
    }

  };


  // ==========================================================
  // PERMISSÃO DA CÂMERA
  // ==========================================================

  if (!permissao) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={C.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permissao.granted && etapa === 'scan') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        <View style={styles.centro}>

          <LinearGradient
            colors={[C.deep, C.brand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconeGrande}
          >
            <MaterialCommunityIcons name="camera-outline" size={34} color={C.white} />
          </LinearGradient>

          <Text style={styles.centroTitulo}>Permitir uso da câmera</Text>

          <Text style={styles.centroTexto}>
            A câmera é usada somente para ler o código de barras dos produtos.
          </Text>

          <TouchableOpacity
            style={styles.btnPrimario}
            activeOpacity={0.85}
            onPress={pedirPermissao}
          >
            <Text style={styles.btnPrimarioTexto}>Permitir câmera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnLink}
            onPress={() => {
              setForm(FORM_VAZIO);
              setEtapa('form');
            }}
          >
            <Text style={styles.btnLinkTexto}>Cadastrar sem ler o código</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }


  // ==========================================================
  // ETAPA · SUCESSO
  // ==========================================================

  if (etapa === 'sucesso') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        <View style={styles.centro}>

          <View style={[styles.iconeGrande, { backgroundColor: '#DDF5E7' }]}>
            <Feather name="check" size={38} color={C.green} />
          </View>

          <Text style={styles.centroTitulo}>Produto cadastrado!</Text>

          <Text style={styles.centroTexto}>
            {nomeSalvo} já está disponível no sistema.
          </Text>

          <TouchableOpacity
            style={styles.btnPrimario}
            activeOpacity={0.85}
            onPress={reiniciar}
          >
            <MaterialCommunityIcons name="barcode-scan" size={20} color={C.white} />
            <Text style={styles.btnPrimarioTexto}>Escanear próximo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnLink}
            onPress={() => {
              reiniciar();
              navigation.navigate('Dashboard');
            }}
          >
            <Text style={styles.btnLinkTexto}>Ver dashboard</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }


  // ==========================================================
  // ETAPA · PRODUTO JÁ CADASTRADO
  // ==========================================================

  if (etapa === 'existente' && existente) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        <View style={styles.centro}>

          <View style={[styles.iconeGrande, { backgroundColor: C.warnBg }]}>
            <Feather name="alert-circle" size={36} color={C.warn} />
          </View>

          <Text style={styles.centroTitulo}>Produto já cadastrado</Text>

          <View style={styles.cardExistente}>

            <Text style={styles.existenteNome}>
              {existente.nome || 'Sem nome'}
            </Text>

            <Text style={styles.existenteCodigo}>
              {existente.codigo_barras}
            </Text>

            {existente.ativo === false && (
              <View style={styles.existenteLinha}>
                <Text style={styles.existenteRotulo}>Situação</Text>
                <Text style={[styles.existenteValor, { color: C.red }]}>
                  Inativo no sistema
                </Text>
              </View>
            )}

            {existente.marca ? (
              <View style={styles.existenteLinha}>
                <Text style={styles.existenteRotulo}>Marca</Text>
                <Text style={styles.existenteValor}>{existente.marca}</Text>
              </View>
            ) : null}

            <View style={styles.existenteLinha}>
              <Text style={styles.existenteRotulo}>Em estoque</Text>
              <Text style={styles.existenteValor}>
                {existente.quantidade_estoque ?? '—'} un.
              </Text>
            </View>

            {existente.preco_venda != null && (
              <View style={styles.existenteLinha}>
                <Text style={styles.existenteRotulo}>Preço de venda</Text>
                <Text style={styles.existenteValor}>
                  R$ {formatarMoeda(existente.preco_venda)}
                </Text>
              </View>
            )}

            {existente.categoria ? (
              <View style={styles.existenteLinha}>
                <Text style={styles.existenteRotulo}>Categoria</Text>
                <Text style={styles.existenteValor}>{existente.categoria}</Text>
              </View>
            ) : null}

          </View>

          <TouchableOpacity
            style={styles.btnPrimario}
            activeOpacity={0.85}
            onPress={reiniciar}
          >
            <MaterialCommunityIcons name="barcode-scan" size={20} color={C.white} />
            <Text style={styles.btnPrimarioTexto}>Escanear outro produto</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }


  // ==========================================================
  // ETAPA · FORMULÁRIO DE CADASTRO
  // ==========================================================

  if (etapa === 'form') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* CABEÇALHO */}

            <View style={styles.formTopo}>

              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.8}
                onPress={reiniciar}
              >
                <Feather name="arrow-left" size={20} color={C.deep} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.topLabel}>NOVO PRODUTO</Text>
                <Text style={styles.topTitle}>Cadastrar produto</Text>
              </View>

            </View>


            {/* CÓDIGO */}

            <LinearGradient
              colors={[C.deep, C.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.codigoBox}
            >
              <MaterialCommunityIcons name="barcode" size={34} color={C.white} />

              <View style={{ flex: 1 }}>
                <Text style={styles.codigoLabel}>CÓDIGO DE BARRAS</Text>

                <TextInput
                  style={styles.codigoInput}
                  value={form.codigo_barras}
                  onChangeText={(t) =>
                    setCampo('codigo_barras', t.replace(/\D/g, '').slice(0, CODIGO_MAX))
                  }
                  placeholder="Sem código"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  keyboardType="number-pad"
                  maxLength={CODIGO_MAX}
                />
              </View>
            </LinearGradient>


            {/* IDENTIFICAÇÃO */}

            <Text style={styles.secao}>IDENTIFICAÇÃO</Text>

            <View style={styles.bloco}>

              <Campo
                label="Nome do produto"
                obrigatorio
                value={form.nome}
                onChangeText={(t) => setCampo('nome', t)}
                placeholder="Ex.: Dipirona 500 mg"
                autoCapitalize="words"
                maxLength={100}
              />

              <Campo
                label="Marca"
                value={form.marca}
                onChangeText={(t) => setCampo('marca', t)}
                placeholder="Ex.: Medley"
                autoCapitalize="words"
                maxLength={100}
              />

              {/* FORNECEDOR */}

              <View style={styles.campo}>
                <Text style={styles.campoLabel}>
                  Fornecedor
                  <Text style={{ color: C.red }}> *</Text>
                </Text>

                <TouchableOpacity
                  style={styles.seletor}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (erroForn || (!carregandoForn && fornecedores.length === 0)) {
                      carregarFornecedores();
                    }
                    setFornModal(true);
                  }}
                >
                  <Text
                    style={[
                      styles.seletorTexto,
                      !fornecedorAtual && { color: '#A5B0C0' },
                    ]}
                    numberOfLines={1}
                  >
                    {fornecedorAtual ? fornecedorAtual.nome : 'Selecionar fornecedor'}
                  </Text>

                  {carregandoForn ? (
                    <ActivityIndicator size="small" color={C.brand} />
                  ) : (
                    <Feather name="chevron-down" size={18} color={C.muted} />
                  )}
                </TouchableOpacity>
              </View>

              {/* CATEGORIA (somente as opções da lista) */}

              <View style={styles.campo}>
                <Text style={styles.campoLabel}>
                  Categoria
                  <Text style={{ color: C.red }}> *</Text>
                </Text>

                <TouchableOpacity
                  style={styles.seletor}
                  activeOpacity={0.8}
                  onPress={() => setCatModal(true)}
                >
                  <Text
                    style={[
                      styles.seletorTexto,
                      !form.categoria && { color: '#A5B0C0' },
                    ]}
                    numberOfLines={1}
                  >
                    {form.categoria || 'Selecionar categoria'}
                  </Text>

                  <Feather name="chevron-down" size={18} color={C.muted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.campoLabel}>Tipo de medicamento</Text>

              <View style={styles.chips}>
                {TIPOS_MEDICAMENTO.map((t) => {
                  const ativo = form.tipo_medicamento === t.chave;

                  return (
                    <TouchableOpacity
                      key={t.chave}
                      activeOpacity={0.8}
                      onPress={() => setCampo('tipo_medicamento', t.chave)}
                      style={[styles.chip, ativo && styles.chipAtivo]}
                    >
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                        {t.rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </View>


            {/* ESTOQUE */}

            <Text style={styles.secao}>ESTOQUE E VALIDADE</Text>

            <View style={styles.bloco}>

              <View style={styles.linha}>
                <Campo
                  style={{ flex: 1 }}
                  label="Quantidade"
                  obrigatorio
                  value={form.quantidade}
                  onChangeText={(t) => setCampo('quantidade', t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                />

                <Campo
                  style={{ flex: 1 }}
                  label="Estoque mínimo"
                  value={form.estoque_minimo}
                  onChangeText={(t) => setCampo('estoque_minimo', t.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>

              <Campo
                label="Validade"
                value={form.validade}
                onChangeText={(t) => setCampo('validade', mascaraData(t))}
                keyboardType="number-pad"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />

            </View>


            {/* PREÇOS */}

            <Text style={styles.secao}>PREÇOS</Text>

            <View style={styles.bloco}>

              <View style={styles.linha}>
                <Campo
                  style={{ flex: 1 }}
                  label="Preço de custo (R$)"
                  obrigatorio
                  value={form.preco_custo}
                  onChangeText={aoMudarCusto}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                />

                <Campo
                  style={{ flex: 1 }}
                  label="Preço de venda (R$)"
                  obrigatorio
                  value={form.preco_venda}
                  onChangeText={aoMudarVenda}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                />
              </View>

              <View style={styles.margemLinha}>

                <Feather name="percent" size={14} color={C.brand} />

                <Text style={styles.margemTexto}>
                  {margemAtual === null
                    ? `Venda automática: custo + ${Math.round(MARGEM_PADRAO * 100)}% de margem`
                    : `Margem atual: ${margemAtual.toFixed(1).replace('.', ',')}%`}
                </Text>

                {vendaManual && (
                  <TouchableOpacity onPress={recalcularVenda}>
                    <Text style={styles.margemLink}>
                      Recalcular {Math.round(MARGEM_PADRAO * 100)}%
                    </Text>
                  </TouchableOpacity>
                )}

              </View>

            </View>


            {/* SALVAR */}

            <TouchableOpacity
              style={[styles.cta, salvando && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={salvar}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color={C.white} />
                  <Text style={styles.ctaTexto}>Confirmar e salvar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLink} onPress={reiniciar}>
              <Text style={styles.btnLinkTexto}>Cancelar e escanear outro</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>


        {/* MODAL · ESCOLHER FORNECEDOR */}

        <Modal
          visible={fornModal}
          transparent
          animationType="slide"
          onRequestClose={() => setFornModal(false)}
        >
          <View style={styles.modalFundo}>

            <View style={styles.modalCard}>

              <View style={styles.modalTopo}>
                <Text style={styles.modalTitulo}>Selecionar fornecedor</Text>

                <TouchableOpacity onPress={() => setFornModal(false)}>
                  <Feather name="x" size={22} color={C.muted} />
                </TouchableOpacity>
              </View>

              {carregandoForn ? (

                <View style={styles.modalVazio}>
                  <ActivityIndicator color={C.brand} />
                </View>

              ) : erroForn ? (

                <View style={styles.modalVazio}>
                  <Text style={styles.modalVazioTexto}>{erroForn}</Text>

                  <TouchableOpacity style={styles.btnSec} onPress={carregarFornecedores}>
                    <Text style={[styles.btnSecTexto, { paddingHorizontal: 20 }]}>
                      Tentar novamente
                    </Text>
                  </TouchableOpacity>
                </View>

              ) : fornecedores.length === 0 ? (

                <View style={styles.modalVazio}>
                  <Text style={styles.modalVazioTexto}>
                    Nenhum fornecedor cadastrado. Cadastre um no sistema web primeiro.
                  </Text>
                </View>

              ) : (

                <ScrollView>
                  {fornecedores.map((f) => {
                    const ativo = f.id === fornecedorId;

                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={styles.modalItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          setFornecedorId(f.id);
                          setFornModal(false);
                        }}
                      >
                        <Text
                          style={[styles.modalItemTexto, ativo && { color: C.brand, fontWeight: '800' }]}
                          numberOfLines={1}
                        >
                          {f.nome}
                        </Text>

                        {ativo && <Feather name="check" size={18} color={C.brand} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

              )}

            </View>

          </View>
        </Modal>


        {/* MODAL · ESCOLHER CATEGORIA */}

        <Modal
          visible={catModal}
          transparent
          animationType="slide"
          onRequestClose={() => setCatModal(false)}
        >
          <View style={styles.modalFundo}>

            <View style={styles.modalCard}>

              <View style={styles.modalTopo}>
                <Text style={styles.modalTitulo}>Selecionar categoria</Text>

                <TouchableOpacity onPress={() => setCatModal(false)}>
                  <Feather name="x" size={22} color={C.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {CATEGORIAS.map((cat) => {
                  const ativo = cat === form.categoria;

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={styles.modalItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCampo('categoria', cat);
                        setCatModal(false);
                      }}
                    >
                      <Text
                        style={[styles.modalItemTexto, ativo && { color: C.brand, fontWeight: '800' }]}
                        numberOfLines={1}
                      >
                        {cat}
                      </Text>

                      {ativo && <Feather name="check" size={18} color={C.brand} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

            </View>

          </View>
        </Modal>

      </SafeAreaView>
    );
  }


  // ==========================================================
  // ETAPA · LEITOR (CÂMERA)
  // ==========================================================

  const translateY = linha.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.cameraTela}>

      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {focada && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={lanterna}
          barcodeScannerSettings={{ barcodeTypes: TIPOS_CODIGO }}
          onBarcodeScanned={consultando || manualAberto ? undefined : aoLerCodigo}
        />
      )}

      {/* ESCURECER FUNDO */}

      <View style={styles.overlay} pointerEvents="none">

        <View style={styles.overlayTopo} />

        <View style={styles.overlayMeio}>
          <View style={styles.overlayLado} />

          <View style={styles.moldura}>
            <View style={[styles.canto, styles.cantoTL]} />
            <View style={[styles.canto, styles.cantoTR]} />
            <View style={[styles.canto, styles.cantoBL]} />
            <View style={[styles.canto, styles.cantoBR]} />

            <Animated.View
              style={[styles.linhaScan, { transform: [{ translateY }] }]}
            />
          </View>

          <View style={styles.overlayLado} />
        </View>

        <View style={styles.overlayBase} />

      </View>


      {/* BARRA SUPERIOR */}

      <SafeAreaView style={styles.camTopo} pointerEvents="box-none">

        <View style={styles.camTopoLinha}>

          <View style={{ flex: 1 }}>
            <Text style={styles.camLabel}>CADASTRO RÁPIDO</Text>
            <Text style={styles.camTitulo}>Escanear produto</Text>
          </View>

          <TouchableOpacity
            style={[styles.camBtn, lanterna && styles.camBtnAtivo]}
            activeOpacity={0.8}
            onPress={() => setLanterna((v) => !v)}
          >
            <MaterialCommunityIcons
              name={lanterna ? 'flashlight' : 'flashlight-off'}
              size={21}
              color={C.white}
            />
          </TouchableOpacity>

        </View>

      </SafeAreaView>


      {/* RODAPÉ */}

      <View style={styles.camRodape}>

        {consultando ? (

          <View style={styles.camCard}>
            <ActivityIndicator color={C.brand} />
            <Text style={styles.camCardTexto}>Consultando o sistema...</Text>
          </View>

        ) : manualAberto ? (

          <View style={styles.camCardManual}>

            <Text style={styles.camCardTitulo}>Digitar código de barras</Text>

            <TextInput
              style={styles.manualInput}
              value={codigoManual}
              onChangeText={(t) => setCodigoManual(t.replace(/\D/g, '').slice(0, CODIGO_MAX))}
              placeholder="Ex.: 7891234567895"
              placeholderTextColor="#A5B0C0"
              keyboardType="number-pad"
              maxLength={CODIGO_MAX}
              autoFocus
            />

            <View style={styles.linha}>

              <TouchableOpacity
                style={[styles.btnSec, { flex: 1 }]}
                onPress={() => {
                  setManualAberto(false);
                  setCodigoManual('');
                }}
              >
                <Text style={styles.btnSecTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimarioPeq, { flex: 1 }]}
                onPress={usarCodigoManual}
              >
                <Text style={styles.btnPrimarioTexto}>Usar código</Text>
              </TouchableOpacity>

            </View>

          </View>

        ) : (

          <View style={styles.camCard}>

            <MaterialCommunityIcons name="barcode-scan" size={22} color={C.deep} />

            <Text style={styles.camCardTexto}>
              Aponte a câmera para o código de barras da embalagem.
            </Text>

          </View>

        )}

        {!consultando && !manualAberto && (

          <View style={styles.camAcoes}>

            <TouchableOpacity
              style={styles.camAcao}
              activeOpacity={0.85}
              onPress={() => setManualAberto(true)}
            >
              <Feather name="edit-3" size={16} color={C.white} />
              <Text style={styles.camAcaoTexto}>Digitar código</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.camAcao}
              activeOpacity={0.85}
              onPress={() => {
                setForm(FORM_VAZIO);
                setVendaManual(false);
                setEtapa('form');
              }}
            >
              <Feather name="plus" size={16} color={C.white} />
              <Text style={styles.camAcaoTexto}>Sem código</Text>
            </TouchableOpacity>

          </View>

        )}

      </View>

    </View>
  );
}


// ============================================================
// ESTILOS
// ============================================================

const QUADRO = 260;

const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: C.bg },

  // ---------- Estados centrais ----------

  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  iconeGrande: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centroTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: C.deep,
    marginTop: 18,
    textAlign: 'center',
  },

  centroTexto: {
    fontSize: 15,
    color: C.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },

  btnPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: C.deep,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 6,
  },

  btnPrimarioPeq: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.deep,
    borderRadius: 14,
    paddingVertical: 13,
  },

  btnPrimarioTexto: {
    color: C.white,
    fontWeight: '700',
    fontSize: 16,
  },

  btnSec: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F2F5',
    borderRadius: 14,
    paddingVertical: 13,
  },

  btnSecTexto: { color: C.deep, fontWeight: '700', fontSize: 15 },

  btnLink: { paddingVertical: 14, alignItems: 'center' },

  btnLinkTexto: { color: C.muted, fontWeight: '600', fontSize: 14 },

  // ---------- Produto existente ----------

  cardExistente: {
    alignSelf: 'stretch',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginTop: 18,
    marginBottom: 14,
  },

  existenteNome: { fontSize: 18, fontWeight: '800', color: C.deep },

  existenteCodigo: { fontSize: 13, color: C.muted, marginTop: 2, marginBottom: 10 },

  existenteLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  existenteRotulo: { fontSize: 14, color: C.muted },

  existenteValor: { fontSize: 14, fontWeight: '700', color: C.text },

  // ---------- Formulário ----------

  formScroll: { padding: 20, paddingBottom: 40, gap: 14 },

  formTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  iconBtn: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#E9F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: C.muted,
    fontWeight: '600',
  },

  topTitle: { fontSize: 20, fontWeight: '800', color: C.text },

  codigoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    padding: 16,
  },

  codigoLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  codigoInput: {
    color: C.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    padding: 0,
    marginTop: 2,
  },

  secao: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: C.muted,
    marginTop: 6,
  },

  bloco: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },

  linha: { flexDirection: 'row', gap: 12 },

  campo: { gap: 6 },

  campoLabel: { fontSize: 13, fontWeight: '600', color: C.muted },

  campoInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.deep,
    backgroundColor: C.white,
  },

  seletor: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: C.white,
  },

  seletorTexto: { flex: 1, fontSize: 15, color: C.deep },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF1F5',
  },

  chipAtivo: { backgroundColor: C.deep },

  chipTexto: { fontSize: 13.5, fontWeight: '600', color: C.muted },

  chipTextoAtivo: { color: C.white },

  margemLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#EAF6F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  margemTexto: { flex: 1, fontSize: 13, color: C.deep, fontWeight: '600' },

  margemLink: { fontSize: 13, color: C.brand, fontWeight: '800' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.deep,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 6,
  },

  ctaTexto: { color: C.white, fontWeight: '700', fontSize: 17 },

  // ---------- Modais (fornecedor e categoria) ----------

  modalFundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,20,45,0.55)',
  },

  modalCard: {
    maxHeight: '70%',
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  modalTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  modalTitulo: { fontSize: 18, fontWeight: '800', color: C.deep },

  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  modalItemTexto: { flex: 1, fontSize: 16, color: C.text },

  modalVazio: { alignItems: 'center', gap: 14, paddingVertical: 28 },

  modalVazioTexto: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ---------- Câmera ----------

  cameraTela: { flex: 1, backgroundColor: '#000' },

  overlay: { ...StyleSheet.absoluteFillObject },

  overlayTopo: { flex: 1, backgroundColor: 'rgba(8,20,45,0.62)' },

  overlayMeio: { flexDirection: 'row', height: QUADRO - 40 },

  overlayLado: { flex: 1, backgroundColor: 'rgba(8,20,45,0.62)' },

  overlayBase: { flex: 1.3, backgroundColor: 'rgba(8,20,45,0.62)' },

  moldura: { width: QUADRO + 40, height: QUADRO - 40 },

  canto: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#5FE3DE',
  },

  cantoTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  cantoTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  cantoBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  cantoBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },

  linhaScan: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#5FE3DE',
    shadowColor: '#5FE3DE',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },

  camTopo: { position: 'absolute', top: 0, left: 0, right: 0 },

  camTopoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 10,
  },

  camLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },

  camTitulo: { fontSize: 22, fontWeight: '800', color: C.white },

  camBtn: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  camBtnAtivo: { backgroundColor: C.brand },

  camRodape: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    gap: 12,
  },

  camCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
  },

  camCardTexto: { flex: 1, fontSize: 15, color: C.text, lineHeight: 21 },

  camCardManual: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },

  camCardTitulo: { fontSize: 16, fontWeight: '800', color: C.deep },

  manualInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    letterSpacing: 1,
    color: C.deep,
  },

  camAcoes: { flexDirection: 'row', gap: 12 },

  camAcao: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
  },

  camAcaoTexto: { color: C.white, fontWeight: '700', fontSize: 14.5 },

});