
const API_LIVROS = "/api/livros";

const listaLivros = document.getElementById("listaLivros");
const busca = document.getElementById("busca");
const mensagemBiblioteca = document.getElementById("mensagemBiblioteca");
const botaoCadastro = document.getElementById("abrirCadastro");
const janelaCadastro = document.getElementById("janelaCadastro");
const janelaDetalhes = document.getElementById("janelaDetalhes");
const formLivro = document.getElementById("formLivro");

let sessao = { logado: false, admin: false };
let livrosBanco = [];
let acoesUsuario = {};
let carregando = false;

function abrirJanela(janela) {
  janela.classList.add("aberta");
}

function fecharJanela(janela) {
  janela.classList.remove("aberta");
}

document.querySelectorAll("[data-fechar]").forEach(botao => {
  botao.addEventListener("click", () => {
    const janela = document.getElementById(botao.dataset.fechar);
    if (janela) fecharJanela(janela);
  });
});

document.querySelectorAll(".janela").forEach(janela => {
  janela.addEventListener("click", event => {
    if (event.target === janela) fecharJanela(janela);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    fecharJanela(janelaCadastro);
    fecharJanela(janelaDetalhes);
  }
});

botaoCadastro.addEventListener("click", () => {
  formLivro.reset();
  document.getElementById("mensagemCadastro").textContent = "";
  abrirJanela(janelaCadastro);
});

busca.addEventListener("input", renderizarLivros);

function textoSeguro(valor, alternativa = "Não informado") {
  return valor !== null && valor !== undefined && valor !== ""
    ? String(valor)
    : alternativa;
}

function criarElemento(tag, texto, classe) {
  const elemento = document.createElement(tag);
  if (texto !== undefined) elemento.textContent = texto;
  if (classe) elemento.className = classe;
  return elemento;
}

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, {
    credentials: "same-origin",
    ...opcoes,
    headers: {
      ...(opcoes.headers || {})
    }
  });

  let dados = {};
  try {
    dados = await resposta.json();
  } catch {
    // A resposta pode não conter JSON.
  }

  if (!resposta.ok) {
    throw new Error(dados.erro || "Não foi possível concluir a operação.");
  }

  return dados;
}

async function verificarSessao() {
  try {
    sessao = await requisicao(`${API_LIVROS}/sessao`);
    botaoCadastro.classList.toggle("visivel", sessao.admin === true);
  } catch (erro) {
    sessao = { logado: false, admin: false };
    botaoCadastro.classList.remove("visivel");
    console.error("Não foi possível verificar a sessão:", erro);
  }
}

async function carregarLivros() {
  carregando = true;
  mensagemBiblioteca.textContent = "Carregando livros...";

  try {
    const dados = await requisicao(API_LIVROS);
    livrosBanco = Array.isArray(dados) ? dados : [];
    mensagemBiblioteca.textContent = "";
  } catch (erro) {
    mensagemBiblioteca.textContent = "Não foi possível carregar os livros cadastrados no banco.";
    console.error(erro);
  }

  carregando = false;
  renderizarLivros();
}

async function carregarAcoes() {
  if (!sessao.logado) {
    acoesUsuario = {};
    return;
  }

  try {
    const dados = await requisicao(`${API_LIVROS}/minhas-acoes`);

    // Aceita tanto uma lista de registros quanto um objeto indexado por ID.
    if (Array.isArray(dados)) {
      acoesUsuario = {};
      dados.forEach(item => {
        acoesUsuario[item.id] = item;
      });
    } else {
      acoesUsuario = dados || {};
    }
  } catch (erro) {
    console.error("Não foi possível carregar suas ações:", erro);
  }
}

function criarIcone(texto, titulo, acao, ativo, classeExtra = "") {
  const botao = criarElemento("button", texto, "acao-icone");
  botao.type = "button";
  botao.title = titulo;
  botao.setAttribute("aria-label", titulo);
  botao.classList.toggle("ativo", Boolean(ativo));

  if (classeExtra) botao.classList.add(classeExtra);

  botao.addEventListener("click", async () => {
    if (!sessao.logado) {
      alert("Entre na sua conta para utilizar esta função.");
      return;
    }

    const estadoAtual = Boolean(acao.ativo);
    botao.disabled = true;

    try {
      await requisicao(`${API_LIVROS}/${acao.id}/acoes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: acao.campo,
          ativo: !estadoAtual
        })
      });

      await carregarAcoes();
      renderizarLivros();
    } catch (erro) {
      alert(erro.message);
    } finally {
      botao.disabled = false;
    }
  });

  return botao;
}

function estadoLivro(livro, campo) {
  const registro = acoesUsuario[livro.id] ||
    acoesUsuario[String(livro.id)] || {};

  return Boolean(registro[campo]);
}


function mostrarDetalhes(livro) {
  document.getElementById("detalheTitulo").textContent = livro.titulo || "";
  document.getElementById("detalheAutor").textContent = textoSeguro(livro.autor);
  document.getElementById("detalheAno").textContent = textoSeguro(livro.ano_publicacao);
  document.getElementById("detalheGenero").textContent = textoSeguro(livro.genero);
  document.getElementById("detalheCategoria").textContent = textoSeguro(livro.categoria);
  document.getElementById("detalheEditora").textContent = textoSeguro(livro.editora);
  document.getElementById("detalhePaginas").textContent = textoSeguro(livro.numero_paginas);
  document.getElementById("detalheTradutor").textContent = textoSeguro(livro.tradutor);
  document.getElementById("detalheFisico").textContent =
    livro.disponibilidade_fisica ? "Sim" : "Não informado";
  document.getElementById("detalheOnline").textContent =
    textoSeguro(livro.plataforma_online);
  document.getElementById("detalheSinopse").textContent =
    livro.sinopse || "Sinopse não informada.";

  const capa = document.getElementById("detalheCapa");
  capa.src = livro.capa_url || "";
  capa.alt = `Capa de ${livro.titulo || "livro"}`;
  capa.hidden = !livro.capa_url;

  const link = document.getElementById("detalheLink");
  link.hidden = !livro.url_leitura;
  link.href = livro.url_leitura || "#";

  abrirJanela(janelaDetalhes);
}

function criarCard(livro) {
  const card = criarElemento("article", undefined, "card");
  card.dataset.titulo = livro.titulo || "";
  card.dataset.autor = livro.autor || "";

  // 1) Título
  const titulo = criarElemento("h3", livro.titulo, "titulo-livro");
  titulo.addEventListener("click", () => mostrarDetalhes(livro));

  // 2) Autor
  const autor = criarElemento("p", livro.autor, "autor");

  // 3) Capa
  const capaContainer = criarElemento("div", undefined, "capa");
  const capa = document.createElement("img");
  capa.src = livro.capa_url || "";
  capa.alt = `Capa de ${livro.titulo || "livro"}`;
  capa.className = "capa-livro";
  capa.loading = "lazy";
  capa.addEventListener("click", () => mostrarDetalhes(livro));
  capaContainer.appendChild(capa);

  // 4) Botões, logo abaixo da capa
  const acoes = criarElemento("div", undefined, "acoes-livro");

  acoes.appendChild(criarIcone(
    "♥", "Gostei",
    { id: livro.id, campo: "gostou", ativo: estadoLivro(livro, "gostou") },
    estadoLivro(livro, "gostou"), "coracao"
  ));

  acoes.appendChild(criarIcone(
    "◷", "Ler depois",
    { id: livro.id, campo: "ler_depois", ativo: estadoLivro(livro, "ler_depois") },
    estadoLivro(livro, "ler_depois")
  ));

  acoes.appendChild(criarIcone(
    "✓✓", "Marcar como lido",
    { id: livro.id, campo: "lido", ativo: estadoLivro(livro, "lido") },
    estadoLivro(livro, "lido")
  ));

  // A ordem aqui define a ordem na tela
  card.append(titulo, autor, capaContainer, acoes);
  return card;
}

function renderizarLivros() {
  if (!listaLivros) return;

  listaLivros.replaceChildren();

  const termo = busca.value.toLowerCase().trim();
    const todos = livrosBanco;
  const filtrados = todos.filter(livro =>
    (livro.titulo || "").toLowerCase().includes(termo) ||
    (livro.autor || "").toLowerCase().includes(termo)
  );

  filtrados.forEach(livro => listaLivros.appendChild(criarCard(livro)));

  if (filtrados.length === 0 && !carregando) {
    listaLivros.appendChild(
      criarElemento("p", "Nenhum livro encontrado. Tente outro título ou autor.", "vazio")
    );
  }
}

formLivro.addEventListener("submit", async event => {
  event.preventDefault();

  const mensagem = document.getElementById("mensagemCadastro");
  const botaoSalvar = document.getElementById("salvarLivro");

  if (!sessao.admin) {
    mensagem.textContent = "Somente administradores podem cadastrar livros.";
    return;
  }

  const dadosLivro = {
    titulo: formLivro.titulo.value.trim(),
    autor: formLivro.autor.value.trim(),
    capa_url: formLivro.capa_url.value.trim(),
    ano_publicacao: Number(formLivro.ano_publicacao.value),
    sinopse: formLivro.sinopse.value.trim(),
    numero_paginas: formLivro.numero_paginas.value
      ? Number(formLivro.numero_paginas.value)
      : null,
    editora: formLivro.editora.value.trim() || null,
    genero: formLivro.genero.value.trim() || null,
    categoria: formLivro.categoria.value.trim() || null,
    tradutor: formLivro.tradutor.value.trim() || null,
    disponibilidade_fisica: formLivro.disponibilidade_fisica.checked,
    plataforma_online: formLivro.plataforma_online.value.trim() || null,
    url_leitura: formLivro.url_leitura.value.trim() || null
  };

  botaoSalvar.disabled = true;
  mensagem.textContent = "Cadastrando livro...";

  try {
    await requisicao(API_LIVROS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosLivro)
    });

    mensagem.textContent = "Livro cadastrado com sucesso!";
    formLivro.reset();

    await carregarLivros();
    fecharJanela(janelaCadastro);
  } catch (erro) {
    mensagem.textContent = erro.message;
  } finally {
    botaoSalvar.disabled = false;
  }
});

async function iniciarBiblioteca() {
  await verificarSessao();
  await Promise.all([carregarLivros(), carregarAcoes()]);
  renderizarLivros();
}

iniciarBiblioteca();