const express = require("express");
const path = require("path");
const session = require("express-session");

const usuarioRoutes = require("./routes/usuario");
const eventoRoutes = require("./routes/evento");
const livroRoutes = require("./routes/livros");

const app = express();

app.use(express.json());

// Configuração das sessões
app.use(session({
    secret: "clube-livro-chave-local",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 2
    }
}));

// Rotas da aplicação
app.use("/usuario", usuarioRoutes);
app.use("/eventos", eventoRoutes);
app.use("/api/livros", livroRoutes);

app.use(express.static(path.join(__dirname, "..")));

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});