// used for creating web applications easily and efficiently
const express = require('express');

// path module is required for working for path names (required for when we
// send files in a get request)
const path = require('path');

// middleware that grabs data from a regular text submission (from a regular
// text form) and attaches it to the req.body property of the request object
// making the data available to the route handler function
const bodyParser = require('body-parser');

const dataService = require(path.join(__dirname, 'data-service.js'));

// middleware that deals with file uploads (enctype=multipart/form-data)
// parses the file(s) received
const multer = require('multer');

// express handlebars
const exphbs = require('express-handlebars');

// port we wish to listen on
const HTTP_PORT = process.env.PORT || 8080;

// main application object
// convention to name it app
const app = express();

// used for the titles of the webpages within the website
const titleMap = new Map();
titleMap.set('/', 'Home');
titleMap.set('/about', 'About');
titleMap.set('/people/add', 'Add Person');
titleMap.set('/pictures/add', 'Add Picture');
titleMap.set('/pictures', 'Pictures');
titleMap.set('/people', 'List Of People');
titleMap.set('/cars', 'List Of Cars');
titleMap.set('/stores', 'List Of Stores');
titleMap.set('/people/*', 'Update Person');

// maps the extension name .hbs to the express handlebars template engine
//
// NOTE: if we were to change the directory where we would store our layouts,
// we must set the "layoutsDir" property
// similarly, if we were to change the directory where we would store our
// partials, we must set the "partialsDir" property
app.engine(
	'.hbs',
	exphbs({
		extname: '.hbs',
		defaultLayout: 'main',
		layoutsDir: path.join(__dirname, '/views/layouts'),
		partialsDir: path.join(__dirname, '/views/partials'),
		helpers: {
			// helpers with 2 parameters define helpers that take the
			// pattern, {{#helperName context}}...{{/helpername}}
			//
			// the context(named url in this case), refers to the object
			// passed into the helper as the "context" variable
			//
			// the options parameter contains a property named fn. fn is
			// used to reference the content within the helper. We invoke
			// it with the "this" keyword
			navLink: function(url, options) {
				return (
					'<li' +
					(url == app.locals.activeRoute ? ' class="active" ' : '') +
					'><a href="' +
					url +
					'">' +
					options.fn(this) +
					'</a></li>'
				);
			},
			// helpers with 1 paramter define helpers that take the form,
			// {{#helperName context}}...{{/helperName}}
			//
			// generally used to wrap content in HTML
			pageTitle: function(options) {
				let str = titleMap.get(
					app.locals.activeRoute.replace(
						new RegExp('^/people/\\d+$'),
						'/people/*'
					)
				);
				return '<title>' + str + '</title>';
			},
			errMsg: function(options) {
				return (
					'<div class="col-md-12 text-center"><strong>' +
					options.fn(this) +
					'</strong></div>'
				);
			},
			formGroup: function(col, options) {
				return (
					'<div class="row"><div class="col-md-' +
					col +
					'">' +
					'<div class="form-group">' +
					options.fn(this) +
					'</div></div></div>'
				);
			},
		},
	})
);
app.set('view engine', '.hbs');

// options for multer
// 1) directory to write to
// 2) function to create a custom file name possibly with a file name
// extension
const storage = multer.diskStorage({
	destination: './public/pictures/uploaded',
	onError: function(err, next) {
		next(err);
	},
	filename: function(req, file, cb) {
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, Date.now() + ext);
	},
});

// the value storage is our custom diskStorage function create a name for the
// file
// the fileFilter property contains a function that validates the type of
// file being uploaded
const upload = multer({
	storage: storage,
	fileFilter: function(req, file, cb) {
		const type = file.mimetype;
		if (
			type !== 'image/png' &&
			type !== 'image/jpg' &&
			type !== 'image/gif'
		) {
			const err = new Error(
				'Bad file type. The file must be a png, jpg, or gif file'
			);
			// this was used as a way to notify the route handler
			// that the type of the file is incorrect.
			// Thus, it is a client error
			err.name = 'filetype';
			cb(err);
		} else {
			cb(null, true);
		}
	},
});

// queries the current route and attaches it into the app.locals property
// making it an application local variable (it will last the lifetime of the
// application)
// Provided by the professor
app.use(function(req, res, next) {
	let route = req.baseUrl + req.path;
	app.locals.activeRoute = route == '/' ? '/' : route.replace(/\/$/, '');
	next();
});

// this function is used as a callback function for the app.listen() function
// this is used to verify the server is listening on a specific port
function onStart() {
	console.log('Express http server listening on ' + HTTP_PORT);
}

// informing express of directories that contain static resources
// using the built-in middleware express.static() function
//
// static files/resources are files that do not change
//
// express automatically sends files (in this case CSS files) in this
// directory as they are requested by the client
app.use(express.static('public/css'));
app.use(express.static('public/pictures/'));

// allows it to grab the data on request and attach it onto the req.body
// property
// urlencoded property is used to parse POST requests where the data
// is submitted in the URL
app.use(bodyParser.urlencoded({extended: true}));

// routes
app.get('/', (req, res) => {
	res.render('home');
});

app.get('/about', (req, res) => {
	res.render('about');
});

app.get('/people/add', (req, res) => {
	res.render('addPeople');
});

app.post('/people/add', (req, res) => {
	dataService
		.addPeople(req.body)
		.then(() => {
			// 308 - permanent redirect
			res.status(308).redirect('/people');
		})
		.catch(err => {
			// not possible to reach catch here
			// however, I placed it here for completeness
			res.render('addPeople', {
				message: err,
			});
		});
});

app.post('/person/update', (req, res) => {
	dataService
		.updatePerson(req.body)
		.then(() => {
			res.status(308).redirect('/people');
		})
		.catch(err => {
                        res.render('person', {
                                message: err
                        });
		});
});

app.get('/people/:id', (req, res) => {
	// req.params property contains all names prefixed with a colon. These
	// names can be replaced with anything, essentially creating a route
	// that can accept an unlimited number of requests each of which can
	// be dynamically handled
	dataService
		.getPeopleById(req.params.id)
		.then(person => {
			// renders the person.hbs file within the {{{body}}}
			// placeholder found in main.hbs(within the layouts
			// directory).
			//
			// person is a custom data property that could have any name.
			// The value of the property is the data to be used when
			// rendering person.hbs
			res.render('person', {
				person: person,
				// NOTE: If I didn't want to use the default layout
				// when rendering a view, I would set the layouts
				// property to false
				// layout: false
				//
				// If I wanted to use another layout instead of the
				// default, I would set the layout property to
				// the name of the other layout residing directory
				// specified implicitly or explicitly in the value of
				// layoutsDir property in the express handlebars
				// config object
				//
				// layout: "otherLayout"
			});
		})
		.catch(err => {
			res.render('person', {
				message: err,
			});
		});
});

// if any accessor function in the data-service module failed, we return
// a JSON object with one property which is a message property that has the
// value of the error object passed to the .catch() callback function
//
// message : err

app.get('/people', (req, res) => {
	// req.query property contains the key-value pairs sent in the query
	// string. Each key name is attached to the req.query property and the
	// property's value is their coressponding value of the pair found in
	// the query string
	//
	// if the query was not used the vin property of req.query will
	// be undefined which is equal to false in javascript
	if (req.query.vin) {
		dataService
			.getPeopleByVin(req.query.vin)
			.then(person => {
				res.render('people', {
					people: person,
				});
			})
			.catch(err => {
				res.render('people', {
					message: err,
				});
			});
	} else {
		dataService
			.getAllPeople()
			.then(people => {
				res.render('people', {
					people: people,
				});
			})
			.catch(err => {
				res.render('people', {
					message: err,
				});
			});
	}
});

app.get('/cars', (req, res) => {
	if (req.query.vin) {
		dataService
			.getCarsByVin(req.query.vin)
			.then(cars => {
				res.render('cars', {
					cars: cars,
				});
			})
			.catch(err => {
				res.render('cars', {
					message: err,
				});
			});
	} else if (req.query.make) {
		dataService
			.getCarsByMake(req.query.make)
			.then(cars => {
				res.render('cars', {
					cars: cars,
				});
			})
			.catch(err => {
				res.render('cars', {
					message: err,
				});
			});
	} else if (req.query.year) {
		dataService
			.getCarsByYear(req.query.year)
			.then(cars => {
				res.render('cars', {
					cars: cars,
				});
			})
			.catch(err => {
				res.render('cars', {
					message: err,
				});
			});
	} else {
		dataService
			.getCars()
			.then(cars => {
				res.render('cars', {
					cars: cars,
				});
			})
			.catch(err => {
				res.render('cars', {
					message: err,
				});
			});
	}
});

app.get('/stores', (req, res) => {
	if (req.query.retailer) {
		dataService
			.getStoresByRetailer(req.query.retailer)
			.then(stores => {
				res.render('stores', {
					stores: stores,
				});
			})
			.catch(err => {
				res.render('stores', {
					message: err,
				});
			});
	} else {
		dataService
			.getStores()
			.then(stores => {
				res.render('stores', {
					stores: stores,
				});
			})
			.catch(err => {
				res.render('stores', {
					message: err,
				});
			});
	}
});

app.get('/pictures', (req, res) => {
	// Note: getPictures() function is a extra function that I added as
	// a helper
	dataService
		.getPictures()
		.then(pictures => {
			res.render('pictures', {
				pictures: pictures,
			});
		})
		.catch(err => {
			if (err.name === 'readdir') res.status(500);

			res.render('pictures', {
				message: err,
			});
		});
});

app.get('/pictures/add', (req, res) => {
	res.render('addImage');
});

// pictureFile is the id of the element in the HTML code
app.post(
	'/pictures/add',
	upload.single('pictureFile'),
	// error handling middleware in case upload fails
	(err, req, res, next) => {
                if (err.name === 'filetype') {
                        res.status(412);
                } else {
                        res.status(500);
                        err.message = "Oops, there was an error on our side!"
                }

		res.render('addImage', {
			message: err.message,
		});
	},
	(req, res) => {
		// route handler
		res.status(308).redirect('/pictures');
	}
);

// I'm a teapot
app.get('/wow', (req, res) => {
	res.status(418).download(
		path.join(__dirname, './public/downloads/1550771217013.png')
	);
});

app.use((req, res) => {
	res.status(404).send("<title>You're lost</title>Page Not Found");
});

// app.listen() will only be called if the initialize() method worked
//
// if app.listen() failed (initialize() function invoked reject()),
// we will not start the server
dataService
	.initialize()
	.then(() => {
		app.listen(HTTP_PORT, onStart);
	})
	.catch(err => {
		console.error(err);
	});
