const express = require("express");
const bcrypt = require("bcrypt"); // 1. Importamos o bcrypt
const connection = require("../database");

const router = express.Router();


// 2. Colocamos 'async' para poder usar a criptografia com 'await'
router.post("/cadastro", async (req, res) => {

    console.log("Dados recebidos do front-end:", req.body);
    
        const { nome, email, matricula, curso, turma, senha } = req.body;   
    try {
        // 3. Geramos o hash seguro da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const sql = "INSERT INTO usuario (nome, email, matricula, curso, turma, senha) VALUES (?, ?, ?, ?, ?, ?)";

        // 4. Inserimos a senhaHash (e não a senha limpa) no banco
        connection.query(sql, [nome, email, matricula, curso, turma, senhaHash], (err, resultado) => {
            if (err) {
                console.error("Erro ao cadastrar:", err);
                return res.status(500).json({ mensagem: "Erro ao cadastrar usuário no banco de dados." });
            }

            console.log("Usuário cadastrado com sucesso!");
            res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
        });
    } catch (erro) {
        console.error("Erro ao processar a senha:", erro);
        res.status(500).json({ mensagem: "Erro interno no servidor." });
    }
});

router.post("/login", async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        const sql = "SELECT * FROM usuario WHERE email = ? OR matricula = ?";

        connection.query(sql, [usuario, usuario], async (err, resultados) => {
            if (err) {
                console.error("Erro ao buscar usuário:", err);
                return res.status(500).json({
                    mensagem: "Erro ao consultar o banco de dados."
                });
            }

            if (resultados.length === 0) {
                return res.status(401).json({
                    mensagem: "E-mail ou matrícula não encontrados."
                });
            }

            const usuarioBanco = resultados[0];

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuarioBanco.senha
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    mensagem: "Senha incorreta."
                });
            }

            req.session.usuario = {
                id: usuarioBanco.id,
                nome: usuarioBanco.nome,
                email: usuarioBanco.email,
                matricula: usuarioBanco.matricula,
                curso: usuarioBanco.curso,
                turma: usuarioBanco.turma,
                tipo: usuarioBanco.tipo
            };

            res.status(200).json({
                mensagem: "Login realizado com sucesso!",
                usuario: {
                    id: usuarioBanco.id,
                    nome: usuarioBanco.nome,
                    email: usuarioBanco.email,
                    matricula: usuarioBanco.matricula,
                    curso: usuarioBanco.curso,
                    turma: usuarioBanco.turma,
                    tipo: usuarioBanco.tipo
                }
            });
        });
    } catch (erro) {
        console.error("Erro no login:", erro);
        res.status(500).json({
            mensagem: "Erro interno no servidor."
        });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ mensagem: "Logout realizado." });
    });
});

module.exports = router;