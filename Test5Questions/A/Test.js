var express = require("express");
var app = express();
var path = require("path");

var HTTP_PORT = process.env.PORT || 8080;

function onHttpStart() {
  console.log("Express http server listening on: " + HTTP_PORT);
}


function makeAJAXRequest(method, url, data){
    if(data){ 
        fetch(url, { 
            method: method,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json'} 
        })
        .then(response => response.json())
        .then(json => {
            console.log(json);   
        });

    }else{  
        fetch(url, { method: method })
        .then(response => response.json())
        .then(json => {
            console.log(json);   
        });
    }
}
function getAllUsers(){
     makeAJAXRequest("GET", "/api/users");
}


app.get("/", function(req,res){
  res.send("Hello World<br /><a href='/about'>Go to the about page</a>");
});

app.get("/api/users", function(req,res){
  res.sendFile(path.join(__dirname, "/week2-assets/about.html"));
});

app.listen(HTTP_PORT, onHttpStart);