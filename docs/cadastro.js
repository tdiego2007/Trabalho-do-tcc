async function cadastrar() {
    // Capturando os elementos exatamente pelos IDs originais
    const nome = document.getElementById("nome").value;
    const matricula = document.getElementById("matricula").value;
    const email = document.getElementById("email").value;
    const curso = document.getElementById("curso").value;
    const turma = document.getElementById("turma").value;
    const senha = document.getElementById("senha").value;
    const confirmar = document.getElementById("confirmar").value;
    const termos = document.getElementById("termos").checked;
    const msg = document.getElementById("msg");

    // Validações no Front-end
    if (!nome || !matricula || !email || !curso || !turma || !senha || !confirmar) {
        alert("Preencha todos os campos.");
        return;
    }

    if (senha !== confirmar) {
        alert("As senhas não coincidem.");
        return;
    }

    if (!termos) {
        alert("Aceite os termos.");
        return;
    }

    // Estrutura de dados para envio ao Back-end Express
    const dadosUsuario = {
        nome,
        email,
        matricula,
        curso,
        turma,
        tipo: "usuario",
        senha
    };

    try {
        msg.style.color = "blue";
        msg.innerText = "Enviando cadastro...";

        // Envio real via Fetch API para o servidor Node.js
        const resposta = await fetch("http://localhost:3000/usuario/cadastro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosUsuario)
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            msg.style.color = "green";
            msg.innerText = resultado.mensagem || "Cadastro realizado com sucesso!";
            setTimeout(() => location.href = "login.html", 1200);
        } else {
            msg.style.color = "red";
            msg.innerText = resultado.mensagem || "Erro ao realizar o cadastro.";
        }
    } catch (erro) {
        console.error("Erro na conexão:", erro);
        msg.style.color = "red";
        msg.innerText = "Não foi possível conectar ao servidor.";
    }
}