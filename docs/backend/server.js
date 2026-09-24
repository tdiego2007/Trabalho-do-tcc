const usuarioRoutes = require("./routes/usuario");

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use("/usuario", usuarioRoutes);

app.use(express.static(path.join(__dirname, "..")));

app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});