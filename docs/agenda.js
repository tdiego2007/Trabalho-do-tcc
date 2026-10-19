// agenda.js — roda no NAVEGADOR e conversa com o servidor (eventos.js) usando fetch

let eventosCache = [];                       // eventos vindos do banco
let sessao = { logado: false, admin: false }; // quem está usando a página

// Evita que texto digitado por alguém vire HTML/JS dentro da página
function escapeHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Função auxiliar: faz a requisição e lança erro com a mensagem do servidor
async function api(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes
  });
  let dados = {};
  try { dados = await resposta.json(); } catch (e) {}
  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro ao falar com o servidor.");
  }
  return dados;
}

async function carregarSessao() {
  try {
    sessao = await api("/eventos/sessao");
  } catch (e) {
    sessao = { logado: false, admin: false };
  }
  // O formulário de cadastro só aparece para administradores
  // (a proteção de verdade é feita no servidor)
  const cardCadastro = document.getElementById("formEvento").closest(".card");
  cardCadastro.style.display = sessao.admin ? "" : "none";
}

async function carregarEventos() {
  try {
    eventosCache = await api("/eventos");
  } catch (e) {
    document.getElementById("listaEventos").innerHTML =
      '<p class="sem-eventos">Não foi possível carregar os eventos.</p>';
    return;
  }
  mostrarEventos();
}

async function adicionarEvento(e) {
  e.preventDefault();

  const titulo = document.getElementById("titulo").value.trim();
  const tipo = document.getElementById("tipo").value;
  const dataHora = document.getElementById("data").value; // ex: 2026-11-01T18:00
  const local = document.getElementById("local").value.trim();
  const descricao = document.getElementById("descricao").value.trim();

  if (!titulo || !tipo || !dataHora || !local) return;

  // O banco guarda data e horário separados
  const [data_evento, horario] = dataHora.split("T");

  try {
    await api("/eventos", {
      method: "POST",
      body: JSON.stringify({ titulo, tipo, data_evento, horario, local, descricao })
    });
    document.getElementById("formEvento").reset();
    await carregarEventos();
  } catch (erro) {
    alert(erro.message);
  }
}

function formatarDataHora(strData) {
  if (!strData) return "";
  const d = new Date(strData);
  if (isNaN(d.getTime())) return strData;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} às ${hora}:${min}h`;
}

async function togglePresenca(idEvento) {
  if (!sessao.logado) {
    alert("Faça login para confirmar presença.");
    window.location.href = "login.html";
    return;
  }
  const evento = eventosCache.find(ev => ev.id === idEvento);
  if (!evento) return;

  try {
    // Se já está inscrito, cancela; senão, se inscreve
    await api(`/eventos/${idEvento}/inscricao`, {
      method: evento.inscrito ? "DELETE" : "POST"
    });
    await carregarEventos();
  } catch (erro) {
    alert(erro.message);
  }
}

async function mudarStatus(idEvento, novoStatus) {
  try {
    await api(`/eventos/${idEvento}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: novoStatus })
    });
    await carregarEventos();
  } catch (erro) {
    alert(erro.message);
  }
}

async function excluirEvento(idEvento) {
  if (!confirm("Tem certeza que deseja excluir este evento?")) return;
  try {
    await api(`/eventos/${idEvento}`, { method: "DELETE" });
    await carregarEventos();
  } catch (erro) {
    alert(erro.message);
  }
}

function mostrarEventos() {
  const lista = document.getElementById("listaEventos");
  const filtro = document.getElementById("filtroTipo").value;

  // O servidor já devolve ordenado por data; aqui só filtramos
  let eventos = eventosCache;
  if (filtro !== "todos") {
    eventos = eventos.filter(e => e.tipo === filtro);
  }

  if (eventos.length === 0) {
    lista.innerHTML = '<p class="sem-eventos">Nenhum evento encontrado para esta categoria.</p>';
    return;
  }

  lista.innerHTML = "";

  eventos.forEach(function (evento) {
    const isConfirmado = !!evento.inscrito;
    const agendado = evento.status === "agendado";
    const badgeClass = "badge-" + (evento.tipo || "Encontro");

    // Aviso de status (só aparece se o evento não está mais agendado)
    let avisoStatus = "";
    if (evento.status === "cancelado") {
      avisoStatus = ' <strong style="color:#c0392b;">(Cancelado)</strong>';
    } else if (evento.status === "concluido") {
      avisoStatus = ' <strong style="color:#27ae60;">(Concluído)</strong>';
    }

    // Botões de administrador
    let botoesAdmin = "";
    if (sessao.admin) {
      if (agendado) {
        botoesAdmin += `<button onclick="mudarStatus(${evento.id}, 'concluido')">Concluir</button> `;
        botoesAdmin += `<button onclick="mudarStatus(${evento.id}, 'cancelado')">Cancelar evento</button> `;
      } else {
        botoesAdmin += `<button onclick="mudarStatus(${evento.id}, 'agendado')">Reabrir</button> `;
      }
      botoesAdmin += `<button onclick="excluirEvento(${evento.id})" class="btn-excluir">Excluir</button>`;
    }

    // Botão de presença: desativado se o evento não está agendado e a pessoa não está inscrita
    const presencaDesativada = !agendado && !isConfirmado;
    let textoPresenca = isConfirmado ? "✔ Presença Confirmada" : "✋ Confirmar Presença";
    if (presencaDesativada) textoPresenca = "Inscrições encerradas";

    const div = document.createElement("div");
    div.className = "evento-item";

    div.innerHTML = `
      <span class="badge-tipo ${escapeHtml(badgeClass)}">${escapeHtml(evento.tipo)}</span>
      <div class="evento-header">
        <h4 class="evento-titulo">${escapeHtml(evento.titulo)}${avisoStatus}</h4>
        <div>${botoesAdmin}</div>
      </div>
      <div class="evento-meta">
        📍 Local: ${escapeHtml(evento.local)} | 🕒 ${formatarDataHora(evento.data_evento + "T" + evento.horario)}
      </div>
      <p class="evento-desc">${escapeHtml(evento.descricao) || "Sem descrição informada."}</p>
      <div class="evento-actions">
        <span class="presenca-status">👥 Presenças confirmadas: <strong>${evento.total_inscritos}</strong></span>
        <button onclick="togglePresenca(${evento.id})"
                class="${isConfirmado ? "btn-confirmado" : "btn-presenca"}"
                ${presencaDesativada ? "disabled" : ""}>
          ${textoPresenca}
        </button>
      </div>
    `;

    lista.appendChild(div);
  });
}

window.onload = async function () {
  await carregarSessao();
  await carregarEventos();
};