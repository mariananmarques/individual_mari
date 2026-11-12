import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";


// ============================================================
// API
// ============================================================

// ============================================================
// EMULADOR ANDROID
// ============================================================

const API_URL = "http://10.0.2.2:5000";


// ============================================================
// CELULAR FÍSICO
// ============================================================

// const API_URL = "http://192.168.1.100:5000";


// ============================================================
// CORES
// ============================================================

const C = {
  brand: "#0FA3A3",
  brandDeep: "#0B3B5A",

  bg: "#F3F7F9",
  card: "#FFFFFF",

  text: "#0F2233",
  muted: "#6B8497",

  border: "#E3EDF2",

  green: "#0E9F6E",
  greenSoft: "#E6F7F0",

  red: "#E05780",
  redSoft: "#FDECF3",

  white: "#FFFFFF",
};


// ============================================================
// FILTROS
// ============================================================

const FILTROS = [
  "Todos",
  "Entrada",
  "Saída",
];


// ============================================================
// FORMATA MOEDA
// ============================================================

function transformarEmReal(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}


// ============================================================
// NORMALIZA TIPO
// ============================================================

function normalizarTipo(tipo) {

  if (!tipo) {
    return "";
  }

  const texto = String(tipo)
    .trim()
    .toUpperCase();

  if (texto === "ENTRADA") {
    return "Entrada";
  }

  if (
    texto === "SAIDA" ||
    texto === "SAÍDA"
  ) {
    return "Saída";
  }

  return tipo;
}


// ============================================================
// TELA DE MOVIMENTAÇÃO
// ============================================================

export default function MovimentacaoScreen({
  navigation,
  route,
}) {

  // ==========================================================
  // CLIENTE LOGADO
  // ==========================================================

  const cliente =
    route?.params?.cliente || null;


  // ==========================================================
  // DEBUG
  // ==========================================================

  useEffect(() => {

    console.log(
      "===================================="
    );

    console.log(
      "CLIENTE RECEBIDO NA MOVIMENTAÇÃO:"
    );

    console.log(cliente);

    console.log(
      "===================================="
    );

  }, [cliente]);


  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [
    movimentacoes,
    setMovimentacoes,
  ] = useState([]);

  const [
    filtro,
    setFiltro,
  ] = useState("Todos");

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState("");


  // ==========================================================
  // NOTIFICAÇÕES
  // ==========================================================

  const [
    produtosCriticos,
    setProdutosCriticos,
  ] = useState([]);

  const [
    produtosBaixo,
    setProdutosBaixo,
  ] = useState([]);

  const [
    mostrarNotificacoes,
    setMostrarNotificacoes,
  ] = useState(false);


  // ==========================================================
  // BUSCAR MOVIMENTAÇÕES
  // ==========================================================

  const carregarMovimentacoes =
    useCallback(async () => {

      try {

        setErro("");


        console.log(
          "===================================="
        );

        console.log(
          "CONSULTANDO MOVIMENTAÇÕES DO DESKTOP"
        );

        console.log(
          `${API_URL}/api/movimentacoes`
        );

        console.log(
          "===================================="
        );


        const resposta =
          await fetch(
            `${API_URL}/api/movimentacoes`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );


        if (!resposta.ok) {

          throw new Error(
            `Erro HTTP ${resposta.status}`
          );

        }


        const dados =
          await resposta.json();


        console.log(
          "DADOS RECEBIDOS DO DESKTOP:"
        );

        console.log(dados);


        if (!dados.sucesso) {

          throw new Error(
            dados.erro ||
            "Erro ao buscar movimentações."
          );

        }


        const listaAPI =
          Array.isArray(
            dados.movimentacoes
          )
            ? dados.movimentacoes
            : [];


        const listaFormatada =
          listaAPI.map(
            (item, index) => {

              const tipo =
                normalizarTipo(
                  item.tipo
                );


              return {

                id:
                  item.id ??
                  `mov-${index}`,

                tipo,

                produto:
                  item.produto ||
                  "Produto não informado",

                parceiro:
                  item.parceiro ||
                  "Não informado",

                quantidade:
                  Number(
                    item.quantidade || 0
                  ),

                valor:
                  Number(
                    item.valor || 0
                  ),

                data:
                  item.data ||
                  "",
              };

            }
          );


        setMovimentacoes(
          listaFormatada
        );

      } catch (error) {

        console.log(
          "ERRO AO CARREGAR MOVIMENTAÇÕES:"
        );

        console.log(error);


        setErro(
          "Não foi possível conectar ao sistema desktop."
        );

      } finally {

        setCarregando(false);

        setRefreshing(false);

      }

    }, []);


  // ==========================================================
  // BUSCAR NOTIFICAÇÕES DO ESTOQUE
  // ==========================================================

  const carregarNotificacoes =
    useCallback(async () => {

      try {

        const resposta =
          await fetch(
            `${API_URL}/api/dashboard`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );


        if (!resposta.ok) {

          throw new Error(
            `Erro HTTP ${resposta.status}`
          );

        }


        const dados =
          await resposta.json();


        const criticos =
          Array.isArray(
            dados?.produtosCriticos
          )
            ? dados.produtosCriticos
            : [];


        const baixo =
          Array.isArray(
            dados?.produtosBaixo
          )
            ? dados.produtosBaixo
            : [];


        setProdutosCriticos(
          criticos
        );

        setProdutosBaixo(
          baixo
        );


      } catch (error) {

        console.log(
          "ERRO AO CARREGAR NOTIFICAÇÕES:"
        );

        console.log(error);

      }

    }, []);


  // ==========================================================
  // CARREGAR AO ABRIR
  // ==========================================================

  useEffect(() => {

    carregarMovimentacoes();
    carregarNotificacoes();

  }, [
    carregarMovimentacoes,
    carregarNotificacoes,
  ]);


  // ==========================================================
  // ATUALIZAR NOTIFICAÇÕES AUTOMATICAMENTE
  // ==========================================================

  useEffect(() => {

    const intervalo =
      setInterval(() => {

        carregarNotificacoes();

      }, 30000);


    return () => {

      clearInterval(
        intervalo
      );

    };

  }, [
    carregarNotificacoes,
  ]);


  // ==========================================================
  // ATUALIZAR
  // ==========================================================

  const atualizar =
    useCallback(() => {

      setRefreshing(true);

      carregarMovimentacoes();
      carregarNotificacoes();

    }, [
      carregarMovimentacoes,
      carregarNotificacoes,
    ]);


  // ==========================================================
  // QUANTIDADE DE ALERTAS
  // ==========================================================

  const quantidadeAlertas =
    produtosCriticos.length +
    produtosBaixo.length;


  // ==========================================================
  // ENTRADAS
  // ==========================================================

  const entradas =
    useMemo(() => {

      return movimentacoes
        .filter(
          (item) =>
            item.tipo ===
            "Entrada"
        )
        .reduce(
          (total, item) =>
            total +
            Math.abs(
              Number(
                item.valor || 0
              )
            ),
          0
        );

    }, [
      movimentacoes,
    ]);


  // ==========================================================
  // SAÍDAS
  // ==========================================================

  const saidas =
    useMemo(() => {

      return movimentacoes
        .filter(
          (item) =>
            item.tipo ===
            "Saída"
        )
        .reduce(
          (total, item) =>
            total +
            Math.abs(
              Number(
                item.valor || 0
              )
            ),
          0
        );

    }, [
      movimentacoes,
    ]);


  // ==========================================================
  // SALDO
  // ==========================================================

  const saldo =
    entradas - saidas;


  // ==========================================================
  // FILTRAR LISTA
  // ==========================================================

  const lista =
    useMemo(() => {

      let resultado = [
        ...movimentacoes,
      ];


      if (
        filtro !== "Todos"
      ) {

        resultado =
          resultado.filter(
            (item) =>
              item.tipo ===
              filtro
          );

      }


      if (
        busca.trim() !== ""
      ) {

        const textoPesquisa =
          busca
            .trim()
            .toLowerCase();


        resultado =
          resultado.filter(
            (item) => {

              const produto =
                String(
                  item.produto ||
                  ""
                ).toLowerCase();


              const parceiro =
                String(
                  item.parceiro ||
                  ""
                ).toLowerCase();


              return (
                produto.includes(
                  textoPesquisa
                ) ||
                parceiro.includes(
                  textoPesquisa
                )
              );

            }
          );

      }


      return resultado;

    }, [
      movimentacoes,
      filtro,
      busca,
    ]);


  // ==========================================================
  // NAVEGAÇÃO
  // ==========================================================

  const navegar = useCallback(
    (rota) => {

      if (!navigation) {
        return;
      }


      if (
        rota === "Perfil"
      ) {

        console.log(
          "Abrindo Perfil pela Movimentação:"
        );

        console.log(cliente);


        navigation.navigate(
          "Perfil",
          {
            cliente:
              cliente,
          }
        );

        return;
      }


      if (
        rota === "Home"
      ) {

        navigation.navigate(
          "Home",
          {
            cliente:
              cliente,
          }
        );

        return;
      }


      if (
        rota === "Dashboard"
      ) {

        navigation.navigate(
          "Dashboard",
          {
            cliente:
              cliente,
          }
        );

        return;
      }


      navigation.navigate(
        rota,
        {
          cliente:
            cliente,
        }
      );

    },
    [
      navigation,
      cliente,
    ]
  );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (carregando) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <StatusBar
          barStyle="light-content"
          backgroundColor={
            C.brandDeep
          }
        />


        <LinearGradient
          colors={[
            C.brandDeep,
            C.brand,
          ]}
          style={
            styles.loadingGradient
          }
        >

          <MaterialCommunityIcons
            name="swap-vertical"
            size={52}
            color="#fff"
          />


          <Text
            style={
              styles.loadingTitle
            }
          >
            Carregando movimentações
          </Text>


          <ActivityIndicator
            size="large"
            color="#fff"
            style={{
              marginTop: 16,
            }}
          />

        </LinearGradient>

      </View>

    );

  }


  // ==========================================================
  // TELA
  // ==========================================================

  return (

    <View
      style={styles.root}
    >

      <StatusBar
        barStyle="light-content"
        backgroundColor={
          C.brandDeep
        }
      />


      {/* =====================================================
          CABEÇALHO
      ===================================================== */}

      <LinearGradient
        colors={[
          C.brandDeep,
          C.brand,
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
      >

        <SafeAreaView>

          <View
            style={
              styles.header
            }
          >

            {/* VOLTAR */}

            <TouchableOpacity
              style={
                styles.iconBtn
              }
              activeOpacity={0.8}
              onPress={() => {

                if (navigation) {
                  navigation.goBack();
                }

              }}
            >

              <Ionicons
                name="arrow-back"
                size={20}
                color="#fff"
              />

            </TouchableOpacity>


            {/* TÍTULO */}

            <View
              style={
                styles.headerCenter
              }
            >

              <Text
                style={
                  styles.headerTitle
                }
              >
                Movimentação
              </Text>


              <Text
                style={
                  styles.headerSub
                }
              >
                MEDSTOCK
              </Text>

            </View>


            {/* NOTIFICAÇÃO */}

            <TouchableOpacity
              style={
                styles.iconBtn
              }
              activeOpacity={0.8}
              onPress={() =>
                setMostrarNotificacoes(true)
              }
            >

              <Ionicons
                name="notifications-outline"
                size={20}
                color="#fff"
              />


              {quantidadeAlertas > 0 && (

                <View
                  style={styles.dot}
                />

              )}

            </TouchableOpacity>

          </View>


          {/* =================================================
              RESUMO
          ================================================= */}

          <View
            style={
              styles.resumoRow
            }
          >

            {/* ENTRADAS */}

            <View
              style={
                styles.resumoCard
              }
            >

              <Ionicons
                name="arrow-down"
                size={14}
                color="#B8F3DF"
              />


              <Text
                style={
                  styles.resumoLabel
                }
              >
                Entradas
              </Text>


              <Text
                style={
                  styles.resumoValor
                }
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {transformarEmReal(
                  entradas
                )}
              </Text>

            </View>


            {/* SAÍDAS */}

            <View
              style={
                styles.resumoCard
              }
            >

              <Ionicons
                name="arrow-up"
                size={14}
                color="#FFC9DE"
              />


              <Text
                style={
                  styles.resumoLabel
                }
              >
                Saídas
              </Text>


              <Text
                style={
                  styles.resumoValor
                }
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {transformarEmReal(
                  saidas
                )}
              </Text>

            </View>


            {/* SALDO */}

            <View
              style={
                styles.resumoCard
              }
            >

              <MaterialCommunityIcons
                name="scale-balance"
                size={14}
                color="#DDF3FF"
              />


              <Text
                style={
                  styles.resumoLabel
                }
              >
                Saldo
              </Text>


              <Text
                style={
                  styles.resumoValor
                }
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {transformarEmReal(
                  saldo
                )}
              </Text>

            </View>

          </View>

        </SafeAreaView>

      </LinearGradient>


      {/* =====================================================
          CONTEÚDO
      ===================================================== */}

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={

          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              atualizar
            }
            colors={[
              C.brand,
            ]}
            tintColor={
              C.brand
            }
          />

        }
      >


        {/* =================================================
            ERRO
        ================================================= */}

        {erro !== "" && (

          <View
            style={
              styles.erroBox
            }
          >

            <Ionicons
              name="cloud-offline-outline"
              size={20}
              color={C.red}
            />


            <View
              style={{
                flex: 1,
              }}
            >

              <Text
                style={
                  styles.erroTitulo
                }
              >
                Erro de conexão
              </Text>


              <Text
                style={
                  styles.erroTexto
                }
              >
                {erro}
              </Text>

            </View>


            <TouchableOpacity
              style={
                styles.tentarBtn
              }
              onPress={
                carregarMovimentacoes
              }
            >

              <Text
                style={
                  styles.tentarTexto
                }
              >
                Tentar
              </Text>

            </TouchableOpacity>

          </View>

        )}


        {/* =================================================
            PESQUISA
        ================================================= */}

        <View
          style={
            styles.searchBox
          }
        >

          <Feather
            name="search"
            size={18}
            color={C.muted}
          />


          <TextInput
            value={busca}
            onChangeText={
              setBusca
            }
            placeholder={
              "Buscar produto, fornecedor ou cliente"
            }
            placeholderTextColor={
              C.muted
            }
            style={
              styles.searchInput
            }
            returnKeyType="search"
            autoCorrect={false}
          />


          {busca.length > 0 && (

            <TouchableOpacity
              onPress={() =>
                setBusca("")
              }
              style={
                styles.clearBtn
              }
            >

              <Feather
                name="x"
                size={16}
                color={C.muted}
              />

            </TouchableOpacity>

          )}

        </View>


        {/* =================================================
            FILTROS
        ================================================= */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={
            styles.filtrosScroll
          }
          contentContainerStyle={
            styles.filtrosContent
          }
        >

          {FILTROS.map(
            (item) => {

              const estaAtivo =
                item === filtro;


              return (

                <TouchableOpacity
                  key={item}
                  onPress={() =>
                    setFiltro(item)
                  }
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    estaAtivo &&
                      styles.chipAtivo,
                  ]}
                >

                  <Text
                    style={[
                      styles.chipTxt,
                      estaAtivo &&
                        styles.chipTxtAtivo,
                    ]}
                  >
                    {item}
                  </Text>

                </TouchableOpacity>

              );

            }
          )}

        </ScrollView>


        {/* =================================================
            TÍTULO
        ================================================= */}

        <View
          style={
            styles.tituloListaRow
          }
        >

          <Text
            style={
              styles.secTitle
            }
          >
            Histórico de movimentações
          </Text>


          <Text
            style={
              styles.contador
            }
          >
            {lista.length}

            {lista.length === 1
              ? " registro"
              : " registros"}
          </Text>

        </View>


        {/* =================================================
            LISTA
        ================================================= */}

        {lista.map(
          (item) => {

            const entrada =
              item.tipo ===
              "Entrada";


            const quantidade =
              Math.abs(
                Number(
                  item.quantidade ||
                  0
                )
              );


            return (

              <View
                key={item.id}
                style={
                  styles.card
                }
              >

                {/* TOPO */}

                <View
                  style={
                    styles.cardTop
                  }
                >

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          entrada
                            ? C.greenSoft
                            : C.redSoft,
                      },
                    ]}
                  >

                    <Ionicons
                      name={
                        entrada
                          ? "arrow-down-circle"
                          : "arrow-up-circle"
                      }
                      size={13}
                      color={
                        entrada
                          ? C.green
                          : C.red
                      }
                    />


                    <Text
                      style={[
                        styles.badgeTxt,
                        {
                          color:
                            entrada
                              ? C.green
                              : C.red,
                        },
                      ]}
                    >
                      {item.tipo}
                    </Text>

                  </View>


                  <View
                    style={
                      styles.dataRow
                    }
                  >

                    <Feather
                      name="calendar"
                      size={12}
                      color={
                        C.muted
                      }
                    />


                    <Text
                      style={
                        styles.dataTxt
                      }
                    >
                      {item.data}
                    </Text>

                  </View>

                </View>


                {/* PRODUTO */}

                <View
                  style={
                    styles.produtoRow
                  }
                >

                  <View
                    style={
                      styles.produtoIcon
                    }
                  >

                    <MaterialCommunityIcons
                      name="pill"
                      size={18}
                      color={
                        C.brand
                      }
                    />

                  </View>


                  <View
                    style={
                      styles.produtoInfo
                    }
                  >

                    <Text
                      style={
                        styles.produto
                      }
                      numberOfLines={1}
                    >
                      {item.produto}
                    </Text>


                    <Text
                      style={
                        styles.parceiro
                      }
                      numberOfLines={1}
                    >

                      {entrada
                        ? "Fornecedor"
                        : "Cliente"}

                      {": "}

                      {item.parceiro}

                    </Text>

                  </View>

                </View>


                {/* RODAPÉ */}

                <View
                  style={
                    styles.cardFooter
                  }
                >

                  <View>

                    <Text
                      style={
                        styles.footLabel
                      }
                    >
                      Quantidade
                    </Text>


                    <Text
                      style={[
                        styles.qtd,
                        {
                          color:
                            entrada
                              ? C.green
                              : C.red,
                        },
                      ]}
                    >

                      {entrada
                        ? "+"
                        : "-"}

                      {quantidade}

                    </Text>

                  </View>


                  <View
                    style={
                      styles.valorContainer
                    }
                  >

                    <Text
                      style={
                        styles.footLabel
                      }
                    >
                      Valor
                    </Text>


                    <Text
                      style={
                        styles.valor
                      }
                    >
                      {transformarEmReal(
                        item.valor
                      )}
                    </Text>

                  </View>

                </View>

              </View>

            );

          }
        )}


        {/* =================================================
            NENHUM RESULTADO
        ================================================= */}

        {lista.length === 0 && (

          <View
            style={
              styles.vazioContainer
            }
          >

            <View
              style={
                styles.vazioIcon
              }
            >

              <MaterialCommunityIcons
                name="clipboard-text-search-outline"
                size={32}
                color={C.muted}
              />

            </View>


            <Text
              style={
                styles.vazioTitulo
              }
            >
              Nenhuma movimentação encontrada
            </Text>


            <Text
              style={
                styles.vazioTexto
              }
            >
              {busca
                ? "Tente pesquisar por outro produto ou parceiro."
                : "Ainda não existem movimentações para exibir."}
            </Text>

          </View>

        )}


        <View
          style={{
            height: 20,
          }}
        />

      </ScrollView>


      {/* =====================================================
          JANELA DE NOTIFICAÇÕES
      ===================================================== */}

      <Modal
        visible={mostrarNotificacoes}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setMostrarNotificacoes(false)
        }
      >

        <View
          style={
            styles.notificationBackground
          }
        >

          <View
            style={
              styles.notificationBox
            }
          >

            <View
              style={
                styles.notificationHeader
              }
            >

              <View>

                <Text
                  style={
                    styles.notificationTitle
                  }
                >
                  Notificações
                </Text>

                <Text
                  style={
                    styles.notificationSubtitle
                  }
                >
                  Alertas do estoque
                </Text>

              </View>


              <TouchableOpacity
                onPress={() =>
                  setMostrarNotificacoes(false)
                }
                style={
                  styles.notificationClose
                }
              >

                <Feather
                  name="x"
                  size={22}
                  color={C.muted}
                />

              </TouchableOpacity>

            </View>


            <ScrollView
              showsVerticalScrollIndicator={false}
              style={
                styles.notificationList
              }
            >

              {produtosCriticos.map(
                (item, index) => (

                  <View
                    key={
                      item.id ||
                      `critico-${index}`
                    }
                    style={
                      styles.notificationItem
                    }
                  >

                    <View
                      style={[
                        styles.notificationIcon,
                        {
                          backgroundColor:
                            "rgba(224,87,128,0.12)",
                        },
                      ]}
                    >

                      <Feather
                        name="alert-triangle"
                        size={19}
                        color={
                          C.red
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.notificationTextArea
                      }
                    >

                      <Text
                        style={
                          styles.notificationItemTitle
                        }
                      >
                        Estoque crítico
                      </Text>

                      <Text
                        style={
                          styles.notificationItemText
                        }
                      >
                        {item?.nome ||
                          item?.produto ||
                          "Produto"}{" "}
                        está com estoque crítico.
                      </Text>

                    </View>

                  </View>

                )
              )}


              {produtosBaixo.map(
                (item, index) => (

                  <View
                    key={
                      item.id ||
                      `baixo-${index}`
                    }
                    style={
                      styles.notificationItem
                    }
                  >

                    <View
                      style={[
                        styles.notificationIcon,
                        {
                          backgroundColor:
                            "rgba(15,163,163,0.12)",
                        },
                      ]}
                    >

                      <Feather
                        name="alert-circle"
                        size={19}
                        color={
                          C.brand
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.notificationTextArea
                      }
                    >

                      <Text
                        style={
                          styles.notificationItemTitle
                        }
                      >
                        Estoque baixo
                      </Text>

                      <Text
                        style={
                          styles.notificationItemText
                        }
                      >
                        {item?.nome ||
                          item?.produto ||
                          "Produto"}{" "}
                        está com estoque baixo.
                      </Text>

                    </View>

                  </View>

                )
              )}


              {quantidadeAlertas === 0 && (

                <View
                  style={
                    styles.notificationEmpty
                  }
                >

                  <Feather
                    name="check-circle"
                    size={35}
                    color={
                      C.brand
                    }
                  />

                  <Text
                    style={
                      styles.notificationEmptyTitle
                    }
                  >
                    Nenhuma notificação
                  </Text>

                  <Text
                    style={
                      styles.notificationEmptyText
                    }
                  >
                    O estoque está normal no momento.
                  </Text>

                </View>

              )}

            </ScrollView>

          </View>

        </View>

      </Modal>

    </View>

  );

}


// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: C.bg,
  },


  // ==========================================================
  // LOADING
  // ==========================================================

  loadingContainer: {
    flex: 1,
    backgroundColor: C.brandDeep,
  },

  loadingGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 14,
  },


  // ==========================================================
  // CONTEÚDO
  // ==========================================================

  scrollContent: {
    padding: 16,
    paddingBottom: 130,
  },


  // ==========================================================
  // CABEÇALHO
  // ==========================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  headerCenter: {
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  headerSub: {
    color:
      "rgba(255,255,255,0.75)",
    fontSize: 13,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 1,
  },

  iconBtn: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  dot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      "#FF6B8A",
  },


  // ==========================================================
  // RESUMO
  // ==========================================================

  resumoRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 18,
  },

  resumoCard: {
    flex: 1,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.18)",
  },

  resumoLabel: {
    color:
      "rgba(255,255,255,0.8)",
    fontSize: 15,
    marginTop: 6,
  },

  resumoValor: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },


  // ==========================================================
  // ERRO
  // ==========================================================

  erroBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.redSoft,
    borderWidth: 1,
    borderColor: "#F4C9D8",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  erroTitulo: {
    color: C.red,
    fontSize: 13,
    fontWeight: "800",
  },

  erroTexto: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },

  tentarBtn: {
    backgroundColor: C.red,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },

  tentarTexto: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },


  // ==========================================================
  // PESQUISA
  // ==========================================================

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#0B3B5A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.text,
    paddingVertical: 8,
  },

  clearBtn: {
    padding: 5,
  },


  // ==========================================================
  // FILTROS
  // ==========================================================

  filtrosScroll: {
    marginTop: 12,
  },

  filtrosContent: {
    paddingRight: 8,
  },

  chip: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },

  chipAtivo: {
    backgroundColor: C.brand,
    borderColor: C.brand,
  },

  chipTxt: {
    fontSize: 16.5,
    color: C.muted,
    fontWeight: "600",
  },

  chipTxtAtivo: {
    color: "#fff",
  },


  // ==========================================================
  // TÍTULO
  // ==========================================================

  tituloListaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },

  secTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.brandDeep,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  contador: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "600",
  },


  // ==========================================================
  // CARD
  // ==========================================================

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#0B3B5A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 2,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },


  // ==========================================================
  // BADGE
  // ==========================================================

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeTxt: {
    fontSize: 15,
    fontWeight: "800",
  },


  // ==========================================================
  // DATA
  // ==========================================================

  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  dataTxt: {
    fontSize: 14,
    color: C.muted,
  },


  // ==========================================================
  // PRODUTO
  // ==========================================================

  produtoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },

  produtoIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#E6F6F6",
    alignItems: "center",
    justifyContent: "center",
  },

  produtoInfo: {
    flex: 1,
    minWidth: 0,
  },

  produto: {
    fontSize: 17.5,
    fontWeight: "700",
    color: C.text,
  },

  parceiro: {
    fontSize: 15,
    color: C.muted,
    marginTop: 2,
  },


  // ==========================================================
  // RODAPÉ
  // ==========================================================

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  footLabel: {
    fontSize: 13,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  qtd: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },

  valorContainer: {
    alignItems: "flex-end",
  },

  valor: {
    fontSize: 19,
    fontWeight: "800",
    color: C.brandDeep,
    marginTop: 2,
  },


  // ==========================================================
  // VAZIO
  // ==========================================================

  vazioContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 45,
    paddingHorizontal: 25,
  },

  vazioIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EAF1F4",
    alignItems: "center",
    justifyContent: "center",
  },

  vazioTitulo: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    marginTop: 14,
    textAlign: "center",
  },

  vazioTexto: {
    fontSize: 12,
    color: C.muted,
    marginTop: 5,
    textAlign: "center",
    lineHeight: 18,
  },


  // ==========================================================
  // MENU INFERIOR
  // ==========================================================

  tabbar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E3EDF2",
    paddingTop: 4,
    paddingBottom: 6,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: -2,
    },
  },

  tabItem: {
    flex: 1,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  tabLabel: {
    fontSize: 13.5,
    color: C.muted,
    fontWeight: "500",
    textAlign: "center",
  },

  tabLabelAtivo: {
    color: C.brand,
    fontWeight: "700",
  },


  // ==========================================================
  // NOTIFICAÇÕES
  // ==========================================================

  notificationBackground: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  notificationBox: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 18,
    maxHeight: "75%",
  },

  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 14,
  },

  notificationTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.brandDeep,
  },

  notificationSubtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
  },

  notificationClose: {
    height: 38,
    width: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F8",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationList: {
    marginTop: 12,
  },

  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F3F7F9",
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },

  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationTextArea: {
    flex: 1,
  },

  notificationItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.brandDeep,
  },

  notificationItemText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
    lineHeight: 18,
  },

  notificationEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },

  notificationEmptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.brandDeep,
    marginTop: 12,
  },

  notificationEmptyText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 5,
    textAlign: "center",
  },

});