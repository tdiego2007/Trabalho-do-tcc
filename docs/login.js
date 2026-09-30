async function entrar() {
const usuario = document.getElementById("usuario").value;
const senha = document.getElementById("senha").value;


if (!usuario || !senha) {
    alert("Preencha todos os campos.");
    return;
}

try {
    const resposta = await fetch("http://localhost:3000/usuario/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            usuario,
            senha
        })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        alert(resultado.mensagem || "Dados inválidos.");
        return;
    }

    localStorage.setItem("usuarioLogado", JSON.stringify(resultado.usuario));

    alert("Login realizado!");
    location.href = "index.html";

} catch (erro) {
    console.error("Erro na conexão:", erro);
    alert("Não foi possível acessar o servidor.");
}


}
