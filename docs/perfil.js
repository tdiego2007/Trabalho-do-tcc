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

    // Por enquanto continuam simulados
    estatisticas: {
        totalLidos: 8,
        metaObjetivo: 12,
        progressoPercentual: 67
    },

    livrosLidos: [
        {
            id: 1,
            titulo: "Cidades de Papel",
            autor: "John Green",
            capa: "cidade de papel.jpg"
        },
        {
            id: 2,
            titulo: "1984",
            autor: "George Orwell",
            capa: "1984.jpg"
        }
    ],

    livrosFavoritos: [
        {
            id: 2,
            titulo: "1984",
            autor: "George Orwell",
            capa: "1984.jpg"
        }
    ],

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


    // Livros lidos
    document.getElementById("gridLidos").innerHTML =
        data.livrosLidos.map(livro => `
            <div class="card-livro">
                <img src="${livro.capa}" alt="${livro.titulo}">
                <h4>${livro.titulo}</h4>
                <p>${livro.autor}</p>
            </div>
        `).join("");


    // Livros favoritos
    document.getElementById("gridFavoritos").innerHTML =
        data.livrosFavoritos.map(livro => `
            <div class="card-livro">
                <img src="${livro.capa}" alt="${livro.titulo}">
                <h4>${livro.titulo}</h4>
                <p>${livro.autor}</p>
            </div>
        `).join("");


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

window.onload = loadProfile;

function sair() {
    localStorage.removeItem("usuarioLogado");
    location.href = "login.html";
}