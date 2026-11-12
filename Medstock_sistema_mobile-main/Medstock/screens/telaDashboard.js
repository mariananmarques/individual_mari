import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

/* ==================================================================
   CONFIGURAÇÃO DA API
   ================================================================== */

const API_URL =
  'http://10.0.2.2:5000/api/dashboard';

/*
  ANDROID EMULATOR:
  Se o Flask estiver rodando no computador:

  http://10.0.2.2:5000/api/dashboard

  CELULAR FÍSICO:
  Troque pelo IP do computador.

  Exemplo:

  http://192.168.0.10:5000/api/dashboard
*/

/* ==================================================================
   PALETA MEDSTOCK
   ================================================================== */

const COLORS = {
  navy: '#1B3A5C',
  ocean: '#2A6B96',
  teal: '#2FA8B5',
  cyan: '#4FD1D9',

  bg: '#F4F7FB',
  card: '#FFFFFF',

  text: '#1E2A3A',
  muted: '#7B8CA6',
  border: '#E6EDF5',

  blue: '#3B82F6',
  green: '#22A55B',
  amber: '#F5A623',
  red: '#EF4444',

  white: '#FFFFFF',
};

/* ==================================================================
   FORMATAÇÃO DE MOEDA
   ================================================================== */

const moeda = (valor) => {
  const numero = Number(valor) || 0;

  return `R$ ${numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/* ==================================================================
   DADOS INICIAIS
   ================================================================== */

const DADOS_INICIAIS = {
  totalProdutos: 0,

  estoqueNormal: 0,
  estoqueBaixo: 0,
  estoqueCritico: 0,

  valorCusto: 0,
  valorVenda: 0,
  lucroPotencial: 0,

  pedidosEntrada: {
    total: 0,
    processados: 0,
    pendentes: 0,
    cancelados: 0,
  },

  pedidosSaida: {
    total: 0,
    processados: 0,
    pendentes: 0,
    cancelados: 0,
  },

  produtosBaixo: [],
  produtosCriticos: [],
};

/* ==================================================================
   ÍCONES
   ================================================================== */

const Icone = ({ nome, cor }) => {
  const glifos = {
    caixa: '▣',
    check: '✓',
    alerta: '!',
    pulso: '∿',
    entrada: '↓',
    saida: '↑',
    lista: '☰',
    custo: '₵',
    venda: '◈',
    lucro: '↗',
  };

  return (
    <Text
      style={[
        styles.glifo,
        {
          color: cor,
        },
      ]}
    >
      {glifos[nome] ?? '•'}
    </Text>
  );
};

/* ==================================================================
   CARD DE ESTATÍSTICA
   ================================================================== */

   const StatCard = ({
    icone,
    cores,
    titulo,
    valor,
    legenda,
  }) => {
    return (
      <View style={styles.statCard}>
  
        {/* ÍCONE + TÍTULO */}
        <View style={styles.statCabecalho}>
  
          <LinearGradient
            colors={cores}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statIcon}
          >
            <Icone
              nome={icone}
              cor="#FFF"
            />
          </LinearGradient>
  
          <Text style={styles.statTitulo}>
            {titulo}
          </Text>
  
        </View>
  
        {/* VALOR */}
        <Text style={styles.statValor}>
          {valor}
        </Text>
  
        {/* LEGENDA */}
        <Text style={styles.statLegenda}>
          {legenda}
        </Text>
  
      </View>
    );
  };

/* ==================================================================
   CARD FINANCEIRO
   ================================================================== */

const FinanceCard = ({
  icone,
  titulo,
  valor,
  cor,
  cores,
  progresso = 1,
}) => {
  const progressoSeguro = Math.min(
    Math.max(Number(progresso) || 0, 0),
    1
  );

  return (
    <View style={styles.financeCard}>
      <View style={styles.linhaTitulo}>
        <Icone
          nome={icone}
          cor={COLORS.muted}
        />

        <Text style={styles.financeTitulo}>
          {titulo}
        </Text>
      </View>

      <Text
        style={[
          styles.financeValor,
          {
            color: cor,
          },
        ]}
      >
        {valor}
      </Text>

      <View style={styles.trilha}>
        <LinearGradient
          colors={cores}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.trilhaFill,
            {
              width: `${progressoSeguro * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

/* ==================================================================
   ANEL DE PROGRESSO
   ================================================================== */

const AnelProgresso = ({
  percentual,
  cor,
  tamanho = 116,
  espessura = 14,
}) => {
  const raio = (tamanho - espessura) / 2;

  const circunferencia =
    2 * Math.PI * raio;

  const percentualSeguro = Math.min(
    Math.max(Number(percentual) || 0, 0),
    100
  );

  const offset =
    circunferencia *
    (1 - percentualSeguro / 100);

  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={tamanho}
        height={tamanho}
        style={{
          position: 'absolute',
        }}
      >
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={COLORS.border}
          strokeWidth={espessura}
          fill="none"
        />

        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={`${circunferencia}`}
          strokeDashoffset={offset}
          fill="none"
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>

      <Text style={styles.anelValor}>
        {percentualSeguro}%
      </Text>

      <Text style={styles.anelLegenda}>
        processados
      </Text>
    </View>
  );
};

/* ==================================================================
   LINHA DE STATUS
   ================================================================== */

const LinhaStatus = ({
  cor,
  rotulo,
  valor,
  total,
}) => {
  const valorSeguro = Number(valor) || 0;
  const totalSeguro = Number(total) || 0;

  const pct =
    totalSeguro > 0
      ? (valorSeguro / totalSeguro) * 100
      : 0;

  return (
    <View style={styles.statusItem}>
      <View style={styles.statusTopo}>
        <View style={styles.statusEsq}>
          <View
            style={[
              styles.ponto,
              {
                backgroundColor: cor,
              },
            ]}
          />

          <Text style={styles.statusRotulo}>
            {rotulo}
          </Text>
        </View>

        <Text style={styles.statusValor}>
          {valorSeguro}
        </Text>
      </View>

      <View style={styles.trilhaFina}>
        <View
          style={[
            styles.trilhaFinaFill,
            {
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: cor,
            },
          ]}
        />
      </View>
    </View>
  );
};

/* ==================================================================
   CARD DE PEDIDOS
   ================================================================== */

const CardPedidos = ({
  icone,
  titulo,
  dados,
  corAnel,
}) => {
  const dadosSeguros = {
    total: Number(dados?.total) || 0,

    processados:
      Number(dados?.processados) || 0,

    pendentes:
      Number(dados?.pendentes) || 0,

    cancelados:
      Number(dados?.cancelados) || 0,
  };

  const pct =
    dadosSeguros.total > 0
      ? Math.round(
          (dadosSeguros.processados /
            dadosSeguros.total) *
            100
        )
      : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.linhaTitulo}>
          <Icone
            nome={icone}
            cor={corAnel}
          />

          <Text style={styles.cardTitulo}>
            {titulo}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>
            {dadosSeguros.total} pedidos
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.anelWrap}>
          <AnelProgresso
            percentual={pct}
            cor={corAnel}
          />
        </View>

        <View
          style={{
            marginTop: 18,
          }}
        >
          <LinhaStatus
            cor={COLORS.green}
            rotulo="Processados"
            valor={dadosSeguros.processados}
            total={dadosSeguros.total}
          />

          <LinhaStatus
            cor={COLORS.amber}
            rotulo="Pendentes"
            valor={dadosSeguros.pendentes}
            total={dadosSeguros.total}
          />

          <LinhaStatus
            cor={COLORS.red}
            rotulo="Cancelados"
            valor={dadosSeguros.cancelados}
            total={dadosSeguros.total}
          />
        </View>
      </View>
    </View>
  );
};

/* ==================================================================
   SAÚDE DO ESTOQUE
   ================================================================== */

const SaudeEstoque = ({
  normal,
  baixo,
  critico,
}) => {
  const normalSeguro = Number(normal) || 0;
  const baixoSeguro = Number(baixo) || 0;
  const criticoSeguro = Number(critico) || 0;

  const total =
    normalSeguro +
    baixoSeguro +
    criticoSeguro;

  const pctAlerta =
    total > 0
      ? Math.round(
          ((baixoSeguro + criticoSeguro) /
            total) *
            100
        )
      : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.linhaTitulo}>
          <Icone
            nome="pulso"
            cor={COLORS.navy}
          />

          <Text style={styles.cardTitulo}>
            Saúde do Estoque
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeTexto}>
            {pctAlerta}% em alerta
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.barraSaude}>
          <View
            style={{
              flex: normalSeguro || 0.0001,
              backgroundColor: COLORS.green,
            }}
          />

          <View
            style={{
              flex: baixoSeguro || 0.0001,
              backgroundColor: COLORS.amber,
            }}
          />

          <View
            style={{
              flex: criticoSeguro || 0.0001,
              backgroundColor: COLORS.red,
            }}
          />
        </View>

        <View style={styles.legendas}>
          <View style={styles.legendaItem}>
            <View
              style={[
                styles.ponto,
                {
                  backgroundColor:
                    COLORS.green,
                },
              ]}
            />

            <Text style={styles.legendaTexto}>
              Normal:{' '}
              <Text
                style={styles.legendaNegrito}
              >
                {normalSeguro}
              </Text>
            </Text>
          </View>

          <View style={styles.legendaItem}>
            <View
              style={[
                styles.ponto,
                {
                  backgroundColor:
                    COLORS.amber,
                },
              ]}
            />

            <Text style={styles.legendaTexto}>
              Baixo:{' '}
              <Text
                style={styles.legendaNegrito}
              >
                {baixoSeguro}
              </Text>
            </Text>
          </View>

          <View style={styles.legendaItem}>
            <View
              style={[
                styles.ponto,
                {
                  backgroundColor:
                    COLORS.red,
                },
              ]}
            />

            <Text style={styles.legendaTexto}>
              Crítico:{' '}
              <Text
                style={styles.legendaNegrito}
              >
                {criticoSeguro}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

/* ==================================================================
   ITEM DE PRODUTO
   ================================================================== */

const ItemProduto = ({
  indice,
  produto,
  quantidade,
  minimo,
  situacao,
  corSituacao,
}) => {
  return (
    <View style={styles.linhaProduto}>
      <Text style={styles.indice}>
        {indice}
      </Text>

      <View
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <Text
          style={styles.produtoNome}
          numberOfLines={1}
        >
          {produto}
        </Text>

        <Text style={styles.produtoMeta}>
          Qtd:{' '}
          <Text
            style={styles.produtoMetaForte}
          >
            {quantidade}
          </Text>

          {' · '}

          Mín:{' '}
          <Text
            style={styles.produtoMetaForte}
          >
            {minimo}
          </Text>
        </Text>
      </View>

      {situacao ? (
        <View
          style={[
            styles.tag,
            {
              backgroundColor: `${corSituacao}1A`,
            },
          ]}
        >
          <Text
            style={[
              styles.tagTexto,
              {
                color: corSituacao,
              },
            ]}
          >
            {situacao}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/* ==================================================================
   CARD DE LISTA
   ================================================================== */

const CardLista = ({
  icone,
  titulo,
  corIcone,
  badge,
  corBadge,
  children,
  vazio,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.linhaTitulo}>
          <Icone
            nome={icone}
            cor={corIcone}
          />

          <Text style={styles.cardTitulo}>
            {titulo}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            corBadge
              ? {
                  backgroundColor:
                    `${corBadge}1A`,
                }
              : null,
          ]}
        >
          <Text
            style={[
              styles.badgeTexto,
              corBadge
                ? {
                    color: corBadge,
                  }
                : null,
            ]}
          >
            {badge}
          </Text>
        </View>
      </View>

      <View>
        {children ? (
          children
        ) : (
          <Text style={styles.vazio}>
            {vazio}
          </Text>
        )}
      </View>
    </View>
  );
};

/* ==================================================================
   TELA DASHBOARD
   ================================================================== */

export default function TelaDashboard({
  navigation,
  route,
}) {

  /*
   * ================================================================
   * USUÁRIO LOGADO
   * ================================================================
   *
   * Aceitamos diferentes nomes para evitar que o usuário se perca
   * durante a navegação.
   *
   * O principal é:
   *
   * route.params.cliente
   *
   */

  const cliente =
    route?.params?.cliente ||
    route?.params?.usuario ||
    route?.params?.user ||
    null;

  /*
   * DEBUG
   *
   * Isso vai aparecer no console do Expo.
   */

  useEffect(() => {
    console.log(
      '================================================'
    );

    console.log(
      'CLIENTE RECEBIDO NO DASHBOARD:'
    );

    console.log(cliente);

    console.log(
      '================================================'
    );
  }, [cliente]);

  const [dados, setDados] =
    useState(DADOS_INICIAIS);

  const [refreshing, setRefreshing] =
    useState(false);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState(null);

  /* ================================================================
     BUSCAR DASHBOARD
     ================================================================ */

  const buscarDashboard = useCallback(
    async (mostrarLoading = true) => {
      try {
        if (mostrarLoading) {
          setCarregando(true);
        }

        setErro(null);

        console.log(
          'Buscando dashboard em:',
          API_URL
        );

        const resposta =
          await fetch(API_URL);

        if (!resposta.ok) {
          throw new Error(
            `Erro HTTP ${resposta.status}`
          );
        }

        const json =
          await resposta.json();

        console.log(
          'Dashboard recebido:',
          json
        );

        if (!json.sucesso) {
          throw new Error(
            json.erro ||
              'A API não retornou sucesso.'
          );
        }

        setDados({
          totalProdutos:
            Number(json.totalProdutos) || 0,

          estoqueNormal:
            Number(json.estoqueNormal) || 0,

          estoqueBaixo:
            Number(json.estoqueBaixo) || 0,

          estoqueCritico:
            Number(json.estoqueCritico) || 0,

          valorCusto:
            Number(json.valorCusto) || 0,

          valorVenda:
            Number(json.valorVenda) || 0,

          lucroPotencial:
            Number(json.lucroPotencial) || 0,

          pedidosEntrada: {
            total:
              Number(
                json.pedidosEntrada?.total
              ) || 0,

            processados:
              Number(
                json.pedidosEntrada?.processados
              ) || 0,

            pendentes:
              Number(
                json.pedidosEntrada?.pendentes
              ) || 0,

            cancelados:
              Number(
                json.pedidosEntrada?.cancelados
              ) || 0,
          },

          pedidosSaida: {
            total:
              Number(
                json.pedidosSaida?.total
              ) || 0,

            processados:
              Number(
                json.pedidosSaida?.processados
              ) || 0,

            pendentes:
              Number(
                json.pedidosSaida?.pendentes
              ) || 0,

            cancelados:
              Number(
                json.pedidosSaida?.cancelados
              ) || 0,
          },

          produtosBaixo:
            Array.isArray(
              json.produtosBaixo
            )
              ? json.produtosBaixo
              : [],

          produtosCriticos:
            Array.isArray(
              json.produtosCriticos
            )
              ? json.produtosCriticos
              : [],
        });
      } catch (error) {
        console.error(
          'Erro ao buscar dashboard:',
          error
        );

        setErro(
          error?.message ||
            'Não foi possível carregar o dashboard.'
        );
      } finally {
        setCarregando(false);
      }
    },
    []
  );

  /* ================================================================
     CARREGAR AO ABRIR
     ================================================================ */

  useEffect(() => {
    buscarDashboard(true);
  }, [buscarDashboard]);

  /* ================================================================
     ATUALIZAR
     ================================================================ */

  const onRefresh = useCallback(
    async () => {
      setRefreshing(true);

      await buscarDashboard(false);

      setRefreshing(false);
    },
    [buscarDashboard]
  );

  /* ================================================================
     PORCENTAGEM DE ALERTA
     ================================================================ */

  const pctAlerta = useMemo(() => {
    const total =
      Number(dados.totalProdutos) || 0;

    if (total === 0) {
      return 0;
    }

    return Math.round(
      (
        (
          Number(dados.estoqueBaixo) +
          Number(dados.estoqueCritico)
        ) /
        total
      ) * 100
    );
  }, [dados]);

  /* ================================================================
     MAIOR VALOR FINANCEIRO
     ================================================================ */

  const maxFin = useMemo(() => {
    return Math.max(
      Number(dados.valorCusto) || 0,
      Number(dados.valorVenda) || 0,
      Number(dados.lucroPotencial) || 0,
      1
    );
  }, [dados]);

  /* ================================================================
     IR PARA PERFIL
     ================================================================ */

  const abrirPerfil = () => {

    console.log(
      '=========================================='
    );

    console.log(
      'Tentando abrir Perfil'
    );

    console.log(
      'Cliente que será enviado:',
      cliente
    );

    console.log(
      '=========================================='
    );

    /*
     * Se não houver cliente, ainda tentamos abrir
     * o Perfil, mas enviamos null.
     *
     * Isso facilita identificar o problema no
     * console caso o Login não esteja enviando
     * os dados.
     */

    navigation.navigate('Perfil', {
      cliente: cliente,
      usuario: cliente,
      user: cliente,
    });
  };

  /* ================================================================
     TELA
     ================================================================ */

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      {/* ==========================================================
          HEADER
          ========================================================== */}

      <LinearGradient
        colors={[
          COLORS.navy,
          COLORS.ocean,
          COLORS.teal,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >

        
        <View style={styles.headerTopo}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Text style={styles.headerTitulo}>
              Dashboard
            </Text>

            <Text
              style={styles.headerSub}
              numberOfLines={2}
            >
              Visão geral do estoque,
              movimentações e resultado
              financeiro
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerBotao}
            activeOpacity={0.8}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color="#FFF"
              />
            ) : (
              <Text
                style={
                  styles.headerBotaoTexto
                }
              >
                Atualizar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ==========================================================
          CONTEÚDO
          ========================================================== */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.conteudo
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal}
          />
        }
      >

        {/* ========================================================
            CARREGANDO
            ======================================================== */}

        {carregando ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
              color={COLORS.teal}
            />

            <Text
              style={styles.loadingTexto}
            >
              Carregando dados do estoque...
            </Text>
          </View>
        ) : null}

        {/* ========================================================
            ERRO
            ======================================================== */}

        {erro ? (
          <View style={styles.erroCard}>
            <Text
              style={styles.erroTitulo}
            >
              Não foi possível carregar
              os dados
            </Text>

            <Text
              style={styles.erroTexto}
            >
              {erro}
            </Text>

            <TouchableOpacity
              style={styles.erroBotao}
              onPress={() =>
                buscarDashboard(true)
              }
            >
              <Text
                style={
                  styles.erroBotaoTexto
                }
              >
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ========================================================
            CARDS DE STATUS
            ======================================================== */}

        <View style={styles.grid}>

          <StatCard
            icone="caixa"
            cores={[
              '#60A5FA',
              '#3B82F6',
            ]}
            titulo="TOTAL DE PRODUTOS"
            valor={dados.totalProdutos}
            legenda="Itens cadastrados"
          />

          <StatCard
            icone="check"
            cores={[
              '#34D399',
              '#16A34A',
            ]}
            titulo="ESTOQUE NORMAL"
            valor={dados.estoqueNormal}
            legenda="Níveis adequados"
          />

          <StatCard
            icone="alerta"
            cores={[
              '#FBBF24',
              '#F59E0B',
            ]}
            titulo="ESTOQUE BAIXO"
            valor={dados.estoqueBaixo}
            legenda={`${pctAlerta}% do estoque total`}
          />

          <StatCard
            icone="pulso"
            cores={[
              '#F87171',
              '#EF4444',
            ]}
            titulo="ESTOQUE CRÍTICO"
            valor={dados.estoqueCritico}
            legenda="Reposição urgente"
          />

        </View>
        {/* ========================================================
            PRODUTOS CRÍTICOS
            ======================================================== */}

        <CardLista
          icone="alerta"
          titulo="Estoque Crítico"
          corIcone={COLORS.red}
          badge={`${dados.produtosCriticos.length} críticos`}
          corBadge={COLORS.red}
          vazio="Nenhum item crítico."
        >
          {dados.produtosCriticos.length > 0
            ? dados.produtosCriticos.map(
                (p, i) => (
                  <ItemProduto
                    key={p.id ?? i}
                    indice={i + 1}
                    produto={
                      p.produto ??
                      p.nome ??
                      'Produto'
                    }
                    quantidade={
                      p.quantidade ?? 0
                    }
                    minimo={
                      p.minimo ?? 0
                    }
                    situacao={
                      p.situacao ??
                      'Crítico'
                    }
                    corSituacao={
                      COLORS.red
                    }
                  />
                )
              )
            : (
              <Text
                style={styles.vazio}
              >
                Nenhum item crítico.
              </Text>
            )}
        </CardLista>

        {/* ========================================================
            PRODUTOS COM ESTOQUE BAIXO
            ======================================================== */}

        <CardLista
          icone="lista"
          titulo="Produtos com Estoque Baixo"
          corIcone={COLORS.navy}
          badge={`${dados.produtosBaixo.length} itens`}
          vazio="Nenhum produto com estoque baixo."
        >
          {dados.produtosBaixo.length > 0
            ? dados.produtosBaixo.map(
                (p, i) => (
                  <ItemProduto
                    key={p.id ?? i}
                    indice={i + 1}
                    produto={
                      p.produto ??
                      p.nome ??
                      'Produto'
                    }
                    quantidade={
                      p.quantidade ?? 0
                    }
                    minimo={
                      p.minimo ?? 0
                    }
                    situacao={
                      p.situacao ??
                      'Estoque baixo'
                    }
                    corSituacao={
                      COLORS.amber
                    }
                  />
                )
              )
            : (
              <Text
                style={styles.vazio}
              >
                Nenhum produto com
                estoque baixo.
              </Text>
            )}
        </CardLista>

        {/* ========================================================
            FINANCEIRO
            ======================================================== */}

        <FinanceCard
          icone="custo"
          titulo="VALOR DE CUSTO"
          valor={moeda(dados.valorCusto)}
          cor={COLORS.text}
          cores={[
            '#3B82F6',
            '#60A5FA',
          ]}
          progresso={
            dados.valorCusto / maxFin
          }
        />

        <FinanceCard
          icone="venda"
          titulo="VALOR DE VENDA"
          valor={moeda(dados.valorVenda)}
          cor={COLORS.text}
          cores={[
            COLORS.ocean,
            COLORS.cyan,
          ]}
          progresso={
            dados.valorVenda / maxFin
          }
        />

        <FinanceCard
          icone="lucro"
          titulo="LUCRO POTENCIAL"
          valor={moeda(
            dados.lucroPotencial
          )}
          cor={COLORS.green}
          cores={[
            '#16A34A',
            '#4ADE80',
          ]}
          progresso={
            dados.lucroPotencial / maxFin
          }
        />

        {/* ========================================================
            PEDIDOS
            ======================================================== */}

        <CardPedidos
          icone="entrada"
          titulo="Pedidos de Entrada"
          dados={dados.pedidosEntrada}
          corAnel={COLORS.green}
        />

        <CardPedidos
          icone="saida"
          titulo="Pedidos de Saída"
          dados={dados.pedidosSaida}
          corAnel={COLORS.blue}
        />

        {/* ========================================================
            SAÚDE DO ESTOQUE
            ======================================================== */}

        <SaudeEstoque
          normal={dados.estoqueNormal}
          baixo={dados.estoqueBaixo}
          critico={dados.estoqueCritico}
        />

        

        <Text style={styles.rodape}>
          Medstock · Controle de estoque
        </Text>

        <View
          style={{
            height: 20,
          }}
        />

      </ScrollView>



    </SafeAreaView>
  );
}



/* ==================================================================
   SOMBRA
   ================================================================== */

const sombra = {
  shadowColor: '#1B3A5C',
  shadowOpacity: 0.08,
  shadowRadius: 12,

  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 3,
};

/* ==================================================================
   ESTILOS
   ================================================================== */

const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* ================================================================
     HEADER
     ================================================================ */

  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,

    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  headerTitulo: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  headerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15.5,
    marginTop: 4,
    lineHeight: 17,
  },

  headerBotao: {
    backgroundColor:
      'rgba(255,255,255,0.18)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.3)',

    paddingHorizontal: 14,
    paddingVertical: 9,

    borderRadius: 12,

    minWidth: 80,

    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBotaoTexto: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '700',
  },

  /* ================================================================
     CONTEÚDO
     ================================================================ */

  scroll: {
    flex: 1,
  },

  conteudo: {
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },

  /* ================================================================
     LOADING
     ================================================================ */

  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },

  loadingTexto: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.muted,
  },

  /* ================================================================
     ERRO
     ================================================================ */

  erroCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,

    borderWidth: 1,
    borderColor: '#FECACA',

    ...sombra,
  },

  erroTitulo: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: '800',
  },

  erroTexto: {
    color: COLORS.muted,
    fontSize: 12.5,
    marginTop: 6,
    lineHeight: 18,
  },

  erroBotao: {
    backgroundColor: COLORS.red,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },

  erroBotaoTexto: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ================================================================
     GRID
     ================================================================ */

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: '46%',

    backgroundColor: COLORS.card,

    borderRadius: 18,

    padding: 14,

    borderWidth: 1,
    borderColor: COLORS.border,

    ...sombra,
  },



  glifo: {
    fontSize: 22,
    fontWeight: '800',
  },

  /* ================================================================
  CABEÇALHO DO CARD
  ÍCONE + TÍTULO
  ================================================================ */

statCabecalho: {
 flexDirection: 'row',

 alignItems: 'center',

 gap: 10,

 marginBottom: 10,
},

/* ================================================================
  ÍCONE
  ================================================================ */

statIcon: {
 width: 42,
 height: 42,

 borderRadius: 12,

 alignItems: 'center',
 justifyContent: 'center',

 flexShrink: 0,
},

/* ================================================================
  TÍTULO
  ================================================================ */

statTitulo: {
 flex: 1,

 fontSize: 15.5,

 fontWeight: '700',

 letterSpacing: 0.7,

 color: COLORS.muted,

 textTransform: 'uppercase',
},

/* ================================================================
  VALOR
  ================================================================ */

statValor: {
 fontSize: 30,

 fontWeight: '800',

 color: COLORS.text,

 marginTop: 0,
},

/* ================================================================
  LEGENDA
  ================================================================ */

statLegenda: {
 fontSize: 14.5,

 color: COLORS.muted,

 marginTop: 2,
},

  statValor: {
    fontSize: 30,
    fontWeight: '800',

    color: COLORS.text,

    marginTop: 2,
  },

  statLegenda: {
    fontSize: 14.5,
    color: COLORS.muted,
    marginTop: 2,
  },

  /* ================================================================
     FINANCEIRO
     ================================================================ */

  financeCard: {
    backgroundColor: COLORS.card,

    borderRadius: 18,

    padding: 16,

    borderWidth: 1,
    borderColor: COLORS.border,

    ...sombra,
  },

  linhaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,

    minWidth: 0,
    flexShrink: 1,
  },

  financeTitulo: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.7,

    color: COLORS.muted,

    textTransform: 'uppercase',
  },

  financeValor: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
  },

  trilha: {
    height: 5,
    borderRadius: 4,

    backgroundColor: COLORS.border,

    marginTop: 12,

    overflow: 'hidden',
  },

  trilhaFill: {
    height: '100%',
    borderRadius: 4,
  },

  /* ================================================================
     CARDS
     ================================================================ */

  card: {
    backgroundColor: COLORS.card,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: COLORS.border,

    overflow: 'hidden',

    ...sombra,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 10,

    paddingHorizontal: 16,
    paddingVertical: 14,

    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  cardTitulo: {
    fontSize: 15.5,
    fontWeight: '700',

    color: COLORS.text,

    flexShrink: 1,
  },

  cardBody: {
    padding: 16,
  },

  badge: {
    backgroundColor: '#EAF1FB',

    paddingHorizontal: 11,
    paddingVertical: 5,

    borderRadius: 999,
  },

  badgeTexto: {
    fontSize: 15.5,
    fontWeight: '700',

    color: COLORS.blue,
  },

  /* ================================================================
     ANEL
     ================================================================ */

  anelWrap: {
    alignItems: 'center',
  },

  anelValor: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },

  anelLegenda: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },

  /* ================================================================
     STATUS
     ================================================================ */

  statusItem: {
    marginBottom: 12,
  },

  statusTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusEsq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusRotulo: {
    fontSize: 14,
    color: COLORS.text,
  },

  statusValor: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  trilhaFina: {
    height: 4,
    borderRadius: 3,

    backgroundColor: COLORS.border,

    marginTop: 7,

    overflow: 'hidden',
  },

  trilhaFinaFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* ================================================================
     SAÚDE
     ================================================================ */

  barraSaude: {
    flexDirection: 'row',

    height: 10,

    borderRadius: 6,

    overflow: 'hidden',
  },

  legendas: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    gap: 16,

    marginTop: 12,
  },

  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendaTexto: {
    fontSize: 15,
    color: COLORS.muted,
  },

  legendaNegrito: {
    color: COLORS.text,
    fontWeight: '700',
  },

  /* ================================================================
     PRODUTOS
     ================================================================ */

  linhaProduto: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 12,

    paddingHorizontal: 16,
    paddingVertical: 15,

    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  indice: {
    width: 18,

    fontSize: 13.5,

    color: COLORS.muted,

    fontWeight: '600',
  },

  produtoNome: {
    fontSize: 16.5,

    fontWeight: '700',

    color: COLORS.text,
  },

  produtoMeta: {
    fontSize: 14,

    color: COLORS.muted,

    marginTop: 2,
  },

  produtoMetaForte: {
    color: COLORS.text,
    fontWeight: '700',
  },

  tag: {
    paddingHorizontal: 15,
    paddingVertical: 5,

    borderRadius: 999,

    maxWidth: 100,
  },

  tagTexto: {
    fontSize: 13,
    fontWeight: '700',
  },

  vazio: {
    padding: 16,

    fontSize: 15,

    color: COLORS.muted,

    textAlign: 'center',
  },

  /* ================================================================
     RODAPÉ
     ================================================================ */

  rodape: {
    textAlign: 'center',

    fontSize: 11.5,

    color: COLORS.muted,

    marginTop: 6,
  },

});