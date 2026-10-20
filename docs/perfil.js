// ===============================
// DADOS DO USUÁRIO LOGADO
// ===============================

const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));

if (!usuarioLogado) {
    alert("Você precisa estar logado.");
    location.href = "login.html";
}


// ===============================
// DADOS DO PERFIL
// ===============================

let perfilData = {
    aluno: {
        nome_completo: usuarioLogado.nome,
        curso: usuarioLogado.curso,
        turma: usuarioLogado.turma,
        matricula: usuarioLogado.matricula,
        email_inst: usuarioLogado.email,
        foto_url: ""
    },

    estatisticas: {
        totalLidos: 0,
        metaObjetivo: 12,
        progressoPercentual: 0
    },

    // Estas três listas vêm do banco (preenchidas em carregarLivrosDoBanco)
    livrosLidos: [],
    livrosFavoritos: [],
    livrosLerDepois: [],

    // Por enquanto continuam simulados
    eventosInscritos: [
        {
            id: 101,
            titulo: "Discussão: Livro do Mês",
            tipo: "Encontro",
            data: "15/08/2026 às 14:00",
            local: "Biblioteca Central"
        }
    ]
};

// ===============================
// TROCA DE ABAS
// ===============================

function switchTab(evt, tabName) {

    document.querySelectorAll(".tab-btn")
        .forEach(btn => btn.classList.remove("active"));

    document.querySelectorAll(".tab-content")
        .forEach(content => content.classList.remove("active"));

    evt.currentTarget.classList.add("active");

    document
        .getElementById(`tab-${tabName}`)
        .classList.add("active");
}


// ===============================
// POPUP DE EDIÇÃO
// ===============================

function openPopup() {
    document.getElementById("editPopup").style.display = "flex";
}

function closePopup() {
    document.getElementById("editPopup").style.display = "none";
}

// ===============================
// LIVROS DO BANCO
// ===============================

// Impede que texto vindo do banco vire código HTML na tela
function escapeHtml(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Pede ao servidor os livros marcados pelo usuário e separa nas três listas
async function carregarLivrosDoBanco() {
    try {
        const resposta = await fetch("/api/livros/minhas-acoes", {
            credentials: "same-origin"
        });

        // 401 = o servidor não reconhece o login (a sessão expirou)
        if (resposta.status === 401) {
            alert("Sua sessão expirou. Entre novamente.");
            localStorage.removeItem("usuarioLogado");
            location.href = "login.html";
            return;
        }

        if (!resposta.ok) {
            throw new Error("Não foi possível buscar os livros.");
        }

        const livros = await resposta.json();

        perfilData.livrosLidos = livros.filter(livro => livro.lido);
        perfilData.livrosFavoritos = livros.filter(livro => livro.gostou);
        perfilData.livrosLerDepois = livros.filter(livro => livro.ler_depois);

        // Meta de leitura calculada com os livros lidos de verdade
        const total = perfilData.livrosLidos.length;
        const meta = perfilData.estatisticas.metaObjetivo;

        perfilData.estatisticas.totalLidos = total;
        perfilData.estatisticas.progressoPercentual =
            Math.min(100, Math.round((total / meta) * 100));

    } catch (erro) {
        console.error(erro);
    }
}

// Monta os cards de uma lista de livros (ou uma mensagem, se estiver vazia)
function montarCards(livros, mensagemVazia) {
    if (livros.length === 0) {
        return `<p>${mensagemVazia}</p>`;
    }

    return livros.map(livro => `
        <div class="card-livro">
            <img src="${escapeHtml(livro.capa_url)}" alt="${escapeHtml(livro.titulo)}">
            <h4>${escapeHtml(livro.titulo)}</h4>
            <p>${escapeHtml(livro.autor)}</p>
        </div>
    `).join("");
}

// ===============================
// CARREGAR PERFIL
// ===============================

function loadProfile() {

    const data = perfilData;

    // Informações do usuário
    document.getElementById("nomeAluno").innerText =
        data.aluno.nome_completo;

    document.getElementById("cursoTurma").innerText =
        `Curso: ${data.aluno.curso} | Turma: ${data.aluno.turma}`;

    document.getElementById("matricula").innerText =
        `Matrícula: ${data.aluno.matricula}`;

    document.getElementById("email").innerText =
        `E-mail: ${data.aluno.email_inst}`;


    // Avatar
    const avatarBox = document.getElementById("avatarBox");

    if (
        data.aluno.foto_url &&
        data.aluno.foto_url.trim() !== ""
    ) {
        avatarBox.innerHTML =
            `<img src="${data.aluno.foto_url}" alt="Foto">`;
    } else {
        avatarBox.innerText =
            data.aluno.nome_completo.charAt(0).toUpperCase();
    }


    // Preencher formulário de edição
    document.getElementById("editNome").value =
        data.aluno.nome_completo;

    document.getElementById("editFoto").value =
        data.aluno.foto_url || "";


    // Meta de leitura
    document.getElementById("goalText").innerText =
        `${data.estatisticas.totalLidos} de ${data.estatisticas.metaObjetivo} livros lidos em 2026 (${data.estatisticas.progressoPercentual}%)`;

    document.getElementById("progressFill").style.width =
        `${data.estatisticas.progressoPercentual}%`;


    // Livros lidos, favoritos e para ler depois (vindos do banco)
    document.getElementById("gridLidos").innerHTML =
        montarCards(data.livrosLidos, "Você ainda não marcou nenhum livro como lido.");

    document.getElementById("gridFavoritos").innerHTML =
        montarCards(data.livrosFavoritos, "Você ainda não curtiu nenhum livro.");

    document.getElementById("gridLerDepois").innerHTML =
        montarCards(data.livrosLerDepois, "Você ainda não guardou livros para ler depois.");
    // Eventos
    document.getElementById("listEventos").innerHTML =
        data.eventosInscritos.map(evento => `
            <div class="event-item">
                <h4>${evento.titulo} (${evento.tipo})</h4>
                <p>📅 ${evento.data} | 📍 ${evento.local}</p>
            </div>
        `).join("");
}


// ===============================
// SALVAR ALTERAÇÕES DO PERFIL
// ===============================

function saveProfile(e) {

    e.preventDefault();

    perfilData.aluno.nome_completo =
        document.getElementById("editNome").value;

    perfilData.aluno.foto_url =
        document.getElementById("editFoto").value;

    loadProfile();

    closePopup();
}


// ===============================
// INICIAR PERFIL
// ===============================

window.onload = async function () {
    await carregarLivrosDoBanco(); // primeiro busca os dados no servidor
    loadProfile();                 // depois desenha a página
};

async function sair() {
    try {
        await fetch("/usuario/logout", { method: "POST" });
    } catch (erro) {
        console.error(erro);
    }

    localStorage.removeItem("usuarioLogado");
    location.href = "login.html";
}