
 // ============================================================
 // SERVIÇO DE API · MEDSTOCK MOBILE
 // ============================================================

export const API_URL = 'http://10.135.60.23:5000';

// ------------------------------------------------------------
// Requisição genérica com tempo limite
// ------------------------------------------------------------

async function requisitar(caminho, opcoes = {}, tempoLimiteMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), tempoLimiteMs);

  try {
    const resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      headers: {
        Accept: 'application/json',
        ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opcoes.headers || {}),
      },
      signal: controller.signal,
    });

    let json = null;

    try {
      json = await resposta.json();
    } catch (e) {
      json = null;
    }

    if (!resposta.ok) {
      throw new Error(json?.erro || `Erro HTTP: ${resposta.status}`);
    }

    return json;
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error('Tempo esgotado ao conectar ao sistema desktop.');
    }

    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------

export async function buscarDashboard() {
  const json = await requisitar('/api/dashboard');

  if (!json?.sucesso) {
    throw new Error(json?.erro || 'Erro ao carregar dashboard.');
  }

  return json;
}

// ------------------------------------------------------------
// PRODUTOS · busca por código de barras
// ------------------------------------------------------------

export async function buscarProdutoPorCodigo(codigo) {
  const json = await requisitar(
    `/api/produtos/codigo/${encodeURIComponent(codigo)}`
  );

  if (!json?.sucesso) {
    throw new Error(json?.erro || 'Erro ao consultar o produto.');
  }

  return json.produto || null;
}

// ------------------------------------------------------------
// FORNECEDORES
// ------------------------------------------------------------

export async function buscarFornecedores() {
  const json = await requisitar('/api/mobile/fornecedores');

  if (!json?.sucesso) {
    throw new Error(json?.erro || 'Erro ao carregar fornecedores.');
  }

  return json.fornecedores || [];
}

// ------------------------------------------------------------
// PRODUTOS · cadastro
// ------------------------------------------------------------

export async function cadastrarProduto(payload) {
  const json = await requisitar(
    '/api/produtos',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    15000
  );

  if (!json?.sucesso) {
    throw new Error(json?.erro || 'Não foi possível cadastrar o produto.');
  }

  return json;
}
