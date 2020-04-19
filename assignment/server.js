// NOTE: All promise driven operations have a catch that simply sends a
// string as a response. This was a requirement according to the assignment.

const express = require("express");
const path = require("path");
const data = require("./data-service.js");
const bodyParser = require('body-parser');
const fs = require("fs");
const multer = require("multer");
const exphbs = require('express-handlebars');
const dataServiceAuth = require('./data-service-auth.js');
const clientSessions = require("client-sessions");
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.engine('.hbs', exphbs({
    extname: '.hbs',
    defaultLayout: "main",
    helpers: {
        navLink: function(url, options){
            return '<li' +
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        errMsg: function(options) {
                return (
                        '<div class="col-md-12 text-center"><strong>' +
                        options.fn(this) +
                        '</strong></div>'
                );
        }

    }
}));

app.set('view engine', '.hbs');

app.use(express.static("public/css/"))

// NOTE: I have removed my file validation logic as it wasn't working

// multer requires a few options to be setup to store files with file extensions
// by default it won't store extensions for security reasons
const storage = multer.diskStorage({
    destination: "./public/pictures/uploaded",
    filename: function (req, file, cb) {
      // we write the filename as the current date down to the millisecond
      // in a large web service this would possibly cause a problem if two people
      // uploaded an image at the exact same time. A better way would be to use GUID's for filenames.
      // this is a simple example.
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });

// tell multer to use the diskStorage function for naming files instead of the default.
const upload = multer({ storage: storage });


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req,res,next){
    let route = req.baseUrl + req.path;
    app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
});

// client session middleware configuration
// The notes used to discuss this was used here
app.use(clientSessions({
    // property to be added to req object
    cookieName: "session",
    // password for client-sessions
    secret: "Web322-app",
    // length of time before being timed out (milliseconds)
    // 2 minutes in this case
    duration: 2 * 60 * 1000,
    // additional time added for every request made (also milliseconds)
    activeDuration: 1000 * 60
}));

// middleware that adds a local session variable to the res object
// giving all renders access to the req.session object created from the
// clientSessions middleware.
app.use(function(req, res, next) {
        res.locals.session = req.session;
        next();
});

// simply checks if the user is logged in, to be used for every route that
// requires the user to be authenticated
// if the user is not authenticated, they will be redirected to the login
// page
function ensureLogin(req, res, next) {
        if(!req.session.user) {
                res.redirect("/login");
        } else {
                next();
        }
}

app.get("/", (req,res) => {
        res.render("home", {
                title: "Home"
        });
});

app.get("/about", (req,res) => {
        res.render("about", {
                title: "About"
        });
});

app.get("/pictures/add", ensureLogin, (req,res) => {
        res.render("addPicture", {
                title: "Add Picture"
        });
});

app.get("/pictures", ensureLogin, (req,res) => {
    fs.readdir("./public/pictures/uploaded", function(err, items) {
        if(items.length === 0)
            res.render("pictures", {
                    errorMessage: "No Images Available, Add Some!",
                    title: "Pictures"
            });
        else
            res.render("pictures", {
                    pictures : items,
                    title: "Pictures"
            });
    });
});
app.post("/pictures/add", ensureLogin, upload.single("pictureFile"), (req,res) =>{
    res.redirect("/pictures");
});


/*People routes */
app.get("/people", ensureLogin, (req,res) => {
    if (req.query.vin){
        data.getPeopleByVin(req.query.vin).then((data)=>{
            res.render("people", (data.length > 0) ? {
                    people:data.map(value => value.dataValues),
                    title: "People"
            } : {
                    information: "no results",
                    title: "People"
            });
        }).catch((err)=>{res.render("people", {
                errorMessage: err,
                title: "People"
        });
    });
    }
    else{
        data.getAllPeople().then((data)=>{
            res.render("people", (data.length > 0) ? {
                    people: data.map(value => value.dataValues),
                    title: "People"
            } : {
                    information: "no results",
                    title: "People"
            });
        }).catch((err)=>{res.render("people",{
                information: err,
                title: "People"
        });
    });
    }
});

app.get("/people/add", ensureLogin, (req,res) => {
    data.getCars().then((data)=>{
        res.render("addPeople", {
                cars: data.map(value => value.dataValues),
                title: "Add Person"
        });
    }).catch((err) => {
        // set cars list to empty array
        res.render("addPeople", {
                cars: [],
                title: "Add Person"
        });
     });
});

app.post("/people/add", ensureLogin, (req, res) => {
    data.addPeople(req.body).then(()=>{
      res.redirect("/people");
    }).catch((err)=>{
            res.status(500).render("addPeople", {
                    errorMessage: "Unable to Add the Person",
                    title: "Add Person"
            })
      });;
});

app.get("/person/:id", ensureLogin, (req, res) => {

    // initialize an empty object to store the values
    let viewData = {};

    data.getPeopleById(req.params.id).then((data) => {
        if (data) {
            viewData.person = data.map(value => value.dataValues)[0];
             //store person data in the "viewData" object as "person"
        } else {
            viewData.person = null; // set person to null if none were returned
        }
    }).then(data.getCars)
    .then((data) => {
            // store cars data in the "viewData" object as "cars"
            viewData.cars = data.map(value => value.dataValues);
            // loop through viewData.cars and once we have found the vin that matches
            // the personâ€™s "vin" value, add a "selected" property to the matching
            // viewData.cars object
            for (let i = 0; i < viewData.cars.length; i++) {
                if (viewData.cars[i].vin == viewData.person.vin) {
                    viewData.cars[i].selected = true;
                }
            }
    }).then(() => {
        if (viewData.person == null) { // if no person - return an error
            res.status(404).render("person", {
                    errorMessage: "No such person",
                    title: "Person"
            });
        } else {
            res.render("person", {
                    viewData: viewData,
                    title: "Person"
            }); // render the "person" view
        }
    }).catch(() => {
        viewData.person = null;
        viewData.cars = []; // set cars to empty if there was an error
        res.status(404).render("person", {
                errorMessage: "No such person",
                title: "Person"
        });
    });
});

app.post("/person/update", ensureLogin, (req, res) => {
    data.updatePerson(req.body).then(()=>{
    res.redirect("/people");
  }).catch((err)=>{
          res.status(500).render("person", {
                  errorMessage: "Unable to Update the Person",
                  title: "Person"
          })
  });;

});

app.get("/people/delete/:id", ensureLogin, (req,res)=>{
    data.deletePeopleById(req.params.id).then(()=>{
      res.redirect("/people");
    }).catch((err)=>{
            res.status(500).render("people", {
                errorMessage: "Unable to Remove Person / Person Not Found",
                title: "People"
            })
    });
  });




/* Cars Routes */
app.get("/cars", ensureLogin, (req,res) => {
    if (req.query.vin){
        data.getCarsByVin(req.query.vin).then((data)=>{
            res.render("cars", (data.length > 0) ? {
                    cars:data.map(value => value.dataValues),
                    title: "Cars"
            } : {
                    information: "no results",
                    title: "Cars"
            });
        }).catch((err)=>{
                res.render("cars",{
                        errorMessage: "There was an error",
                        title: "Cars"
                })
        });
    }
    else if (req.query.year){
        data.getCarsByYear(req.query.year).then((data)=>{
            res.render("cars", (data.length > 0) ? {
                cars:data.map(value => value.dataValues),
                title: "Cars"
            } : {
                information: "no results",
                title: "Cars"
            });
        }).catch((err)=>{
                res.render("cars",{
                        errorMessage: "There was an error",
                        title: "Cars"
                })
        });
    }
    else if (req.query.make){
        data.getCarsByMake(req.query.make).then((data)=>{
            res.render("cars", (data.length > 0) ? {
                    cars:data.map(value => value.dataValues),
                    title: "Cars"
            } : {
                    information: "no results",
                    title: "Cars"
            });
        }).catch((err)=>{
                res.render("cars", {
                        errorMessage: "There was an error",
                        title: "Cars"
                });
        });
    }
    else{
        data.getCars().then((data)=>{
            res.render("cars", (data.length > 0) ? {
                    cars:data.map(value => value.dataValues),
                    title: "Cars"
            } : {
                    information: "no results",
                    title: "Cars"
            });
        }).catch((err)=>{
                res.render("cars",{
                        errorMessage: "There was an error",
                        title: "Cars"
                });
        });
    }
});
app.get("/cars/add", ensureLogin, (req,res) => {
        res.render("addCars", {
                title: "Add Car"
        });
});

app.post("/car/add", ensureLogin, (req, res) => {
    data.addCars(req.body).then(()=>{
      res.redirect("/cars");
    }).catch((err)=>{
        // In this catch, if the user adds a car that has a vin that's the
        // same as an existing car, instead of sending a string, I respond
        // with a nice-looking error message.
        // I only changed this catch specifically as it's the only common
        // error that the user can cause (other than a bad connection, but in
        // that case they shouldn't be using my website 😛)
            res.status(500).render("addCars", {
                    errorMessage: "Unable to Add the Car 🤣",
                    title: "Add Car"
            });
      });
});

app.get("/car/:vin", ensureLogin, (req,res)=>{
    data.getCarsByVin(req.params.vin).then((data)=>{
            if(data.length > 0) {
                res.render("car", {
                        car:data.map(value => value.dataValues)[0],
                        title: "Car"
                });
            } else {
                res.render("car", {
                        errorMessage: "No such car",
                        title: "Car"
                });
            }
    }).catch(()=>{
            res.status(404).render("car", {
                    errorMessage: "Car Not Found",
                    title: "Car"
            })
    });
});

app.post("/car/update", ensureLogin, (req, res) => {
    data.updateCar(req.body).then(()=>{
    res.redirect("/cars");
  }).catch((err)=>{
          res.status(500).render("car", {
                  errorMessage: "Unable to Update the Car",
                  title: "Car"
          });
  });

});

app.get("/cars/delete/:vin", ensureLogin, (req,res)=>{
    data.deleteCarByVin(req.params.vin).then(()=>{
      res.redirect("/cars");
    }).catch((err)=>{
            res.status(500).render("cars", {
                    errorMessage: "Unable to Remove Car / Car Not Found",
                    title: "List of Cars"
            });
    });
  });



/*Stores Route*/
app.get("/stores", ensureLogin, (req,res) => {
    if (req.query.retailer){
        data.getStoresByRetailer(req.query.retailer).then((data)=>{
            res.render("stores", (data.length > 0) ? {
                    stores:data.map(value => value.dataValues),
                    title: "List of Stores"
            } : {
                    information: "no results",
                    title: "List of Stores"
            });
        }).catch((err)=>{
                res.render("stores", {
                        errorMessage: err,
                        title: "List of Stores"
                })
        });
    }
    else{
        data.getStores().then((data)=>{
            res.render("stores", (data.length > 0) ? {
                    stores:data.map(value => value.dataValues),
                    title: "List of Stores"
            } : {
                    information: "no results",
                    title: "List of Stores"
            });
        }).catch((err)=>{
                res.render("stores", {
                        errorMessage: err,
                        title: "List of Stores"
                })
        });
    }
});

app.get("/stores/add", ensureLogin, (req,res) => {
        res.render("addStore", {
                title: "Add Store"
        });
});

app.post("/stores/add", ensureLogin, (req, res) => {
    data.addStore(req.body).then(()=>{
        res.redirect("/stores");
    }).catch((err)=>{
            res.status(500).render("addStore", {
                    errorMessage: "Unable to Add the Store",
                    title: "Add Store"
            })
      });
});

app.get("/store/:id", ensureLogin, (req,res)=>{
    data.getStoreById(req.params.id).then((data)=>{
        if(data.length > 0) {
                res.render("store", {
                        store:data.map(value => value.dataValues)[0],
                        title: "Store"
                });
        } else {
                res.status(404).render("store", {
                        errorMessage: "No such store",
                        title: "Store"
                })
        }
    }).catch(()=>{
            res.status(404).render("store", {
                    errorMessage: "Store Not Found",
                    title: "Store"
            })
    });
});

app.post("/store/update", ensureLogin, (req, res) => {
    data.updateStore(req.body).then(()=>{
        res.redirect("/stores");
    }).catch((err)=>{
            res.status(500).render("store", {
                    errorMessage: "Unable to Update the Store",
                    title: "Store"
            })
      });

});

app.get("/stores/delete/:id", ensureLogin, (req,res)=>{
    data.deleteStoreById(req.params.id).then(()=>{
        res.redirect("/stores");
    }).catch((err)=>{
            res.status(500).render("stores", {
                    errorMessage: "Unable to Remove Store / Store Not Found",
                    title: "List of Stores"
            })
    });
});

app.get("/login", (req, res) => {
        res.render("login", {
                title: "Login"
        });
});

app.post("/login", (req, res) => {
        // User-Agent header contains browser and machine information
        req.body.userAgent = req.get("User-Agent");
        dataServiceAuth.checkUser(req.body).then((user) => {
                req.session.user = {
                        userName: user.userName,
                        email: user.email,
                        loginHistory: user.loginHistory
                }

                res.redirect("/people");
        }).catch(err => {
                res.render("login", {
                        errorMessage: err,
                        userName: req.body.userName,
                        title: "Login"
                });
        });
});

app.get("/logout", (req,res) => {
        // destroying the user's session
        req.session.reset();
        res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => {
        res.render("userHistory", {
                title: "History"
        });
});

app.get("/register", (req, res) => {
        res.render("register", {
                title: "Register"
        });
});

app.post("/register", (req, res) => {
        dataServiceAuth.registerUser(req.body).then(() => {
                res.render("register", {
                        successMessage: "User created",
                        title: "Register"
                });
        }).catch(err => {
                res.render("register", {
                        errorMessage: err,
                        userName: req.body.userName,
                        title: "Register"
                });
        });
});


/***404 routes and initialize**/
app.use((req, res) => {
    res.status(404).send("Page Not Found");
  });

data.initialize().then(dataServiceAuth.initialize).then(function(){
    app.listen(HTTP_PORT, function(){
        console.log("app listening on: " + HTTP_PORT)
    });
}).catch(function(err){
    console.log("unable to start server: " + err);
});
