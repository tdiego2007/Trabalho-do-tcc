const express = require("express");
const connection = require("../database");

const router = express.Router();

// Executa consultas no MySQL usando Promises.
function query(sql, parametros = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, parametros, (erro, resultado) => {
            if (erro) {
                reject(erro);
            } else {
                resolve(resultado);
            }
        });
    });
}

// Confere se existe um usuário autenticado na sessão
// e consulta o tipo de usuário diretamente no banco.
async function exigirLogin(req, res, next) {
    if (!req.session?.usuario?.id) {
        return res.status(401).json({
            erro: "Faça login para utilizar esta função."
        });
    }

    try {
        const usuarios = await query(
            "SELECT id, tipo FROM usuario WHERE id = ?",
            [req.session.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                erro: "Sua sessão não é mais válida. Entre novamente."
            });
        }

        req.usuarioAtual = usuarios[0];
        next();

    } catch (erro) {
        console.error("Erro ao verificar usuário:", erro.message);

        return res.status(500).json({
            erro: "Erro ao verificar o usuário."
        });
    }
}

// Confere se o usuário autenticado é administrador.
function exigirAdmin(req, res, next) {
    exigirLogin(req, res, () => {
        if (req.usuarioAtual.tipo !== "admin") {
            return res.status(403).json({
                erro: "Somente um administrador pode cadastrar livros públicos."
            });
        }

        next();
    });
}

// Normaliza os campos opcionais de texto.
function campoTexto(valor, limite = 500) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const texto = String(valor).trim();

    return texto ? texto.slice(0, limite) : null;
}

// Retorna informações sobre a sessão atual.
// A biblioteca usa essa resposta para saber se deve
// exibir o botão de cadastro de livros.
router.get("/sessao", async (req, res) => {
    if (!req.session?.usuario?.id) {
        return res.json({
            logado: false,
            admin: false
        });
    }

    try {
        const usuarios = await query(
            "SELECT id, tipo FROM usuario WHERE id = ?",
            [req.session.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.json({
                logado: false,
                admin: false
            });
        }

        return res.json({
            logado: true,
            admin: usuarios[0].tipo === "admin"
        });

    } catch (erro) {
        console.error(
            "Erro ao verificar sessão da biblioteca:",
            erro.message
        );

        return res.status(500).json({
            erro: "Erro ao verificar a sessão."
        });
    }
});

// Lista os livros públicos cadastrados.
// A consulta pode ser feita sem login.
router.get("/", async (req, res) => {
    try {
        const livros = await query(
            `SELECT
                id,
                titulo,
                autor,
                capa_url,
                ano_publicacao,
                sinopse,
                numero_paginas,
                editora,
                disponibilidade_fisica,
                plataforma_online,
                url_leitura,
                tradutor,
                genero,
                categoria,
                criado_em
             FROM livro
             WHERE ativo = 1
             ORDER BY titulo`
        );

        return res.json(livros);

    } catch (erro) {
        console.error("Erro ao listar livros:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível carregar a biblioteca. Verifique se as tabelas foram criadas."
        });
    }
});

// Retorna os livros que o usuário marcou como favorito,
// para ler depois ou como lidos.
router.get("/minhas-acoes", exigirLogin, async (req, res) => {
    try {
        const livros = await query(
            `SELECT
                l.id,
                l.titulo,
                l.autor,
                l.capa_url,
                l.ano_publicacao,
                l.sinopse,
                l.numero_paginas,
                l.editora,
                l.disponibilidade_fisica,
                l.plataforma_online,
                l.url_leitura,
                l.tradutor,
                l.genero,
                l.categoria,
                lu.gostou,
                lu.ler_depois,
                lu.lido
             FROM livro_usuario lu
             JOIN livro l ON l.id = lu.id_livro
             WHERE lu.id_usuario = ?
               AND l.ativo = 1
               AND (
                   lu.gostou = 1
                   OR lu.ler_depois = 1
                   OR lu.lido = 1
               )
             ORDER BY lu.atualizado_em DESC, l.titulo`,
            [req.usuarioAtual.id]
        );

        return res.json(livros);

    } catch (erro) {
        console.error("Erro ao carregar ações pessoais:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível carregar seus livros."
        });
    }
});

// Cadastra um livro.
// Somente administradores autenticados podem executar esta rota.
router.post("/", exigirAdmin, async (req, res) => {
    const dados = req.body || {};

    const titulo = campoTexto(dados.titulo, 200);
    const autor = campoTexto(dados.autor, 200);
    const capa = campoTexto(dados.capa_url, 600);
    const sinopse = campoTexto(dados.sinopse, 10000);
    const ano = Number(dados.ano_publicacao);

    if (
        !titulo ||
        !autor ||
        !capa ||
        !sinopse ||
        !Number.isInteger(ano) ||
        ano < 1 ||
        ano > 9999
    ) {
        return res.status(400).json({
            erro: "Preencha título, autor, capa, ano de publicação e sinopse."
        });
    }

    const paginas =
        dados.numero_paginas === "" ||
        dados.numero_paginas == null
            ? null
            : Number(dados.numero_paginas);

    if (
        paginas !== null &&
        (
            !Number.isInteger(paginas) ||
            paginas < 1 ||
            paginas > 100000
        )
    ) {
        return res.status(400).json({
            erro: "O número de páginas informado é inválido."
        });
    }

    if (
        dados.url_leitura &&
        !/^https?:\/\//i.test(String(dados.url_leitura).trim())
    ) {
        return res.status(400).json({
            erro: "O link de leitura deve começar com http:// ou https://."
        });
    }

    try {
        const resultado = await query(
            `INSERT INTO livro (
                titulo,
                autor,
                capa_url,
                ano_publicacao,
                sinopse,
                numero_paginas,
                editora,
                disponibilidade_fisica,
                plataforma_online,
                url_leitura,
                tradutor,
                genero,
                categoria,
                criado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                titulo,
                autor,
                capa,
                ano,
                sinopse,
                paginas,
                campoTexto(dados.editora, 160),
                dados.disponibilidade_fisica ? 1 : 0,
                campoTexto(dados.plataforma_online, 180),
                campoTexto(dados.url_leitura, 600),
                campoTexto(dados.tradutor, 180),
                campoTexto(dados.genero, 120),
                campoTexto(dados.categoria, 120),
                req.usuarioAtual.id
            ]
        );

        const livros = await query(
            "SELECT * FROM livro WHERE id = ?",
            [resultado.insertId]
        );

        return res.status(201).json(livros[0]);

    } catch (erro) {
        console.error("Erro ao cadastrar livro:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível cadastrar o livro."
        });
    }
});

// Atualiza uma das três ações pessoais do usuário.
// A lista de colunas permitidas impede que o cliente
// escolha livremente qual coluna SQL será alterada.
router.patch("/:id/acoes", exigirLogin, async (req, res) => {
    const idLivro = Number(req.params.id);
    const { acao, ativo } = req.body || {};

    const colunasPermitidas = {
        gostou: "gostou",
        ler_depois: "ler_depois",
        lido: "lido"
    };

    if (
        !Number.isInteger(idLivro) ||
        idLivro < 1 ||
        !colunasPermitidas[acao] ||
        typeof ativo !== "boolean"
    ) {
        return res.status(400).json({
            erro: "Ação de livro inválida."
        });
    }

    try {
        const livros = await query(
            "SELECT id FROM livro WHERE id = ? AND ativo = 1",
            [idLivro]
        );

        if (livros.length === 0) {
            return res.status(404).json({
                erro: "Livro não encontrado."
            });
        }

        const coluna = colunasPermitidas[acao];

        await query(
            `INSERT INTO livro_usuario (
                id_usuario,
                id_livro,
                ${coluna}
            )
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                ${coluna} = VALUES(${coluna}),
                atualizado_em = CURRENT_TIMESTAMP`,
            [
                req.usuarioAtual.id,
                idLivro,
                ativo ? 1 : 0
            ]
        );

        return res.json({
            ok: true,
            acao,
            ativo
        });

    } catch (erro) {
        console.error("Erro ao salvar ação do livro:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível salvar sua alteração."
        });
    }
});

// Busca os detalhes completos de um livro.
// Esta rota fica depois das rotas fixas, como /sessao
// e /minhas-acoes, para evitar conflitos.
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            erro: "Identificador inválido."
        });
    }

    try {
        const livros = await query(
            "SELECT * FROM livro WHERE id = ? AND ativo = 1",
            [id]
        );

        if (livros.length === 0) {
            return res.status(404).json({
                erro: "Livro não encontrado."
            });
        }

        return res.json(livros[0]);

    } catch (erro) {
        console.error("Erro ao consultar livro:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível carregar os detalhes do livro."
        });
    }
});

module.exports = router;