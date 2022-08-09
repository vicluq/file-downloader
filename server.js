const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt"); // Encriptar a senha

const FileModule = require("./models/File");

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads" });

// ! Connecting to Mongoose
mongoose.connect(process.env.DB_URL);

// ! Setting up template engine
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true })); // adiciona o body nas requisicoes normais que envolvem form normal
app.use(express.json());

app.get("/", (req, res) => {
  // * Rendering html / engine files (can pass opts)
  // o metodo procura logo pela pasta /views
  res.render("index");
});

// ! File upload logic
// Passamos a middleware upload.single (apenas um arquivo no input file) para a requisição
// a middleware vai lidar com o arquivo enviado em pedaços pra gnt e nos fornece ele todo
// ? ela adiciona o objeto file na req com nosso arquivo e suas props
app.post("/upload", upload.single("file"), async (req, res) => {
  // Save file to database
  const fileContent = {
    path: req.file.path, // onde ta
    originalName: req.file.originalname,
  };

  if (req.body.password) {
    fileContent.password = await bcrypt.hash(req.body.password, 10); // Encriptando a senha -> gera uma senha encriptada, o salt é o que garante que cada hash gerado seja unico (senhas identicas)
  }

  const file = await FileModule.create(fileContent); // Criando o arquivo na base de dados

  // * Sending file link to user for download
  res.render("index", { file_url: `${req.headers.origin}/file/${file._id}` });
});

async function handleDownload(req, res) {
  const file = await FileModule.findById(req.params.id);

  if (file.password && !req.body.password) {
    res.render("password");
    return; // nao acessar o conteudo abaixo
  }

  if (
    file.password &&
    !(await bcrypt.compare(req.body.password, file.password))
  ) {
    // caso a comparacao seja falsa (SENHAS !=)
    res.render("password", { error: true });
    return;
  }

  // TODO caso o arquivo tenha sido deletado, criar um template 404

  file.downloadCount = file.downloadCount + 1; // Mudando o Download count
  file.save(); // Salvando na db após mudar o download count

  res.set({ Location: "/success" }); // setar headers (aqui seto o location para redirecionar o user apos donwload)
  // O client side que vai redirecionar apos o fetch nessa url

  // ? Metodo express que seta os headers e faz tudo automatico para o download de tipos de arquivos
  res.download(file.path, file.originalName);
}

// ? A mesma handler serve, sendo que a post recebe o body e na requisicao, nao na url como query (mais seguro)
// a get nao vai receber o body (nosso form é post) com dados, mas se nao tem senha no arquivo, nao ha problema e ela lida por si só
app.get("/file/:id", handleDownload);
app.post("/file/:id", handleDownload);

app.get("/success", (req, res) => {
  console.log("Redirected!");
  res.render("succes");
});

app.listen(process.env.PORT, () => {
  console.log(`App running on port ${process.env.PORT}`);
});

/*
    TODO:
        - Refazer usando o fetch na hora fazer o download
            - Usar fetch
                - Criar interface com botao que faz o pedido de download (GET file/:id)
                - Se precisar de senha, usar essa mesma interface com form pra senha (POST file/:id)
                - Apos clique/submissao de senha, redirecionar o user para a tela de sucesso
            - Redirecionar o usuário para uma tela de sucesso (header location via client side)
*/