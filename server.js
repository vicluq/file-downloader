const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt') // Encriptar a senha

const FileModule = require('./models/File');

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads" });

// ! Connecting to Mongoose
mongoose.connect(process.env.DB_URL);

// ! Setting up template engine
app.set("view engine", "ejs");

app.get('/', (req, res) => {
    // * Rendering html / engine files (can pass opts)
    // o metodo procura logo pela pasta /views
    res.render('index'); 
});

// ! File upload logic
// Passamos a middleware upload.single (apenas um arquivo no input file) para a requisição
// a middleware vai lidar com o arquivo enviado em pedaços pra gnt e nos fornece ele todo
// ? ela adiciona o objeto file na req com nosso arquivo e suas props
app.post("/upload", upload.single('file'), async (req, res) => {
    // Save file to database
    const fileContent = {
        path: req.file.path, // onde ta
        originalName: req.file.originalname,
    }

    if(req.body.password) {
        fileContent.password = await bcrypt.hash(req.body.password, 10); // Encriptando a senha -> gera uma senha encriptada, o salt é o que garante que cada hash gerado seja unico (senhas identicas)
    }

    const file = await FileModule.create(fileContent); // Criando o arquivo na base de dados

    // * Sending file link to user for download
    res.render("index", { file_url: `${req.headers.origin}/file/${file._id}` });
});

app.get("/file/:id", async (req, res) => {
    const file = await FileModule.findById(req.params.id);

    if(file.password && !req.body.password) {
        res.render('password');
        return; // nao acessar o conteudo abaixo
    }

    file.downloadCount = file.downloadCount + 1; // Mudando o Download count
    file.save(); // Salvando na db após mudar o download count

    res.download(file.path, file.originalName); // ? Metodo express que seta os headers e faz udo automatico para o download de tipos de arquivos
});

app.listen(process.env.PORT, () => {
    console.log(`App running on port ${process.env.PORT}`);
})