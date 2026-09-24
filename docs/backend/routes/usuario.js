const express = require("express");
const bcrypt = require("bcrypt"); // 1. Importamos o bcrypt
const connection = require("../database");

const router = express.Router();


// 2. Colocamos 'async' para poder usar a criptografia com 'await'
router.post("/cadastro", async (req, res) => {

    console.log("Dados recebidos do front-end:", req.body);
    
    const { nome, email, matricula, curso, turma, tipo, senha } = req.body;

    try {
        // 3. Geramos o hash seguro da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const sql = "INSERT INTO usuario (nome, email, matricula, curso, turma, tipo, senha) VALUES (?, ?, ?, ?, ?, ?, ?)";

        // 4. Inserimos a senhaHash (e não a senha limpa) no banco
        connection.query(sql, [nome, email, matricula, curso, turma, tipo, senhaHash], (err, resultado) => {
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

module.exports = router;