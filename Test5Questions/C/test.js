const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
});

app.post("/test/person", (req, res) => {
     res.json({message: "add the user: " + req.body.fName + " " + req.body.lName});
});



// setup http server to listen on HTTP_PORT
app.listen(HTTP_PORT, () => {
    console.log("Express http server listening on: " + HTTP_PORT);
});