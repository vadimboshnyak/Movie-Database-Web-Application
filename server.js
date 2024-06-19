const express = require('express');

let app = express();
const path = require('path');
const { title } = require('process');
var url = require('url');

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());


const session = require('express-session');
app.use(session({cookie: {maxAge: 14400000}, secret: "12412424"}));

app.use('/', function(req,res, next){
    console.log(req.session);
    next();
})

var moviesObj = require("./movieData.json");
var peopleObj = require("./peopleData.json");
const e = require('express');
const { dir } = require('console');
var users = [
    {id: 0, username: "willy2", password: "imthebest", bio: "I love movies", follows: ["animallover", "John Lasseter", "Joss Whedon", "Brad Bird", "Nicolas Cage"], followers: ["xxpuregamer"], reviews: [{'movie':'Toy Story', 'rate': 4.5, 'detailedReview':'This movie is great'}], contributer: true, notifications: []},
    {id: 1,username: "animallover", password: "dogsandcats", bio: "I love movies about animals", follows: ["James Frecheville", " Uma Thurman"], followers: ["xxpuregamer", "willy2"], reviews: [], contributer: false, notifications: []},
    {id: 2,username: "xxpuregamer", password: "123456789", bio: "I love gaming and movies", follows: ["Chris Elliott",  "Rowan Atkinson", "willy2", "animallover", "jasonpop"], followers: ["jasonpop"], reviews: [], contributer: false, notifications: []},
    {id: 3,username: "jasonpop", password: "macarana", bio: "I love Music movies", follows: ["Jonathan Taylor Thomas", "xxpuregamer"], followers: ["dogsandcats", "xxpuregamer"], reviews: [], contributer: true, notifications: []}
]


app.set('view engine', 'pug')
app.get('/', function (req, res) {
    res.status(200).render('home.pug', {session: req.session});
})
app.get('/login', function(req, res){
    if (req.session.loggedin){
        res.status(401).send("Already logged in");
    }
    else{
        res.status(200).render('login.pug')   
    };
})
app.post('/loginUser', login);

app.get('/signup', function(req, res){
    res.status(200).render('signup.pug');
})
app.post('/signup', createUser);

app.get('/logout', logout);

app.get('/addremoveMovie', removeMovie);
app.post('/removeMovie', removeMovie);
app.post('/addMovie', addMovie);


app.get('/movies', parseQuery, getMovies);
app.get('/movies/:movieid', getSingleMovie);

app.get('/people', parseQueryPerson, getPeople);
app.get('/people/:personid', getPerson);

app.get('/users', parseQueryUser, getUsers);
app.get('/users/:userid', getSingleUser);
app.post('/contributer', switchContributer);

app.post('/followUser', followUser);
app.post('/unfollowUser', unfollowUser);
app.post('/followPerson', followPerson);
app.post('/unfollowPerson', unfollowPerson);
app.get('/personAdd', addPerson);
app.post('/personAdd', addPerson);

app.get('/editMovie', editMovie);
app.post('/editMovie', editMovie);
app.post('/addActor', addActor);
app.post('/addWriter', addWriter);
app.post('/addDirector', addDirector);

app.get('/addReview', addReview);
app.post('/addReview', addReview);
app.post('/addDetailedReview', addDetailedReview);

app.get('/forgotpw', forgotpw);
app.post('/forgotpw', forgotpw);
app.post('/createpw', createpw);

app.get('*', function(req, res){
    res.status(404).send("This URL doesn't exist");
  });
//Sets the coming in queries to correct params
function parseQuery (req, res, next){
    req.properParams = {};
    
    for (let id in moviesObj){
        let curMovie = moviesObj[id];
        
        if (req.query.title && curMovie.title.toLowerCase().includes(req.query.title.toLowerCase())){
            req.properParams.title = req.query.title.toLowerCase();
        }
        if (req.query.year && curMovie.year === req.query.year){
            req.properParams.year = req.query.year;
        }
        for (let i in curMovie.genre){
            let lowerGenre = curMovie.genre[i].toLowerCase();
            if (req.query.genre && lowerGenre===(req.query.genre.toLowerCase())){
                req.properParams.genre = req.query.genre.toLowerCase();
            }
        }
        if (req.query.minrating && curMovie.averageRating >= req.query.minrating){
            req.properParams.minrating = req.query.minrating;
        }
    }
    next();
}
//Gets movie page, if there are queries then it searchs within the queries
//If no queries then all movies are printed, if query makes no sense then no movies are showed
function getMovies(req, res){
    let returnMovies = [];
    let findMovie;
    for (let id in moviesObj){
        let curMovie = moviesObj[id];
        if (req.url === '/movies'){
            returnMovies.push(curMovie);
        }
        let lowerGenre = curMovie.genre.map(genre => genre.toLowerCase());
        findMovie = ((!req.properParams.title) || (curMovie.title.toLowerCase().includes(req.properParams.title))) &&
                        ((!req.properParams.year) || (req.properParams.year === curMovie.year)) &&
                        ((!req.properParams.genre) || (lowerGenre.includes(req.properParams.genre))) && ((!req.properParams.minrating) || (curMovie.averageRating >= Number(req.properParams.minrating)));
            if (findMovie){
                returnMovies.push(curMovie);
        }
        //console.log(returnMovies)
        if (req.query.title === ""){
            returnMovies.push(curMovie);
        }
        if (req.query.year === ""){
            returnMovies.push(curMovie);
        }
        if (req.query.genre === ""){
            returnMovies.push(curMovie);
        }
        if (req.query.minrating === ""){
            returnMovies.push(curMovie);
        }
    }
    res.format({
        'text/html': function(){
            returnMovies = returnMovies.splice(0, 125);
            if (returnMovies.length === null){
                res.status(404).send(JSON.stringify(returnMovies));
            }
            else{
                res.render('movies.pug', {moviesObj: returnMovies, session: req.session});
            }
        },
        'application/json': function (){
            returnMovies = returnMovies.splice(0, 125);
            if (returnMovies.length === null){
                res.status(404).send(JSON.stringify(returnMovies));
            }
            else{
                res.status(200).send(JSON.stringify(returnMovies));
            }
        }
    })
}
//Shows individual movie with it's movie ID
//Finds similar movie within an algorithm of similar 2 genres
function getSingleMovie(req, res){
    let similarMovies = [];
    let movieId = req.params.movieid;
    req.session.url1 = movieId;

    for (let id in moviesObj){
        let curMovie = moviesObj[id];
        if (curMovie.title.toLowerCase() === movieId.toLowerCase()){
            for (var i = Math.floor(Math.random() * 5000); i < Object.keys(moviesObj).length; i++){
                let counter = 0;
                if (curMovie.title != moviesObj[i].title){
                    for (let j in moviesObj[i].genre){
                        if (curMovie.genre.includes(moviesObj[i].genre[j])){
                            if (curMovie.genre.length < 3){
                                similarMovies.push(moviesObj[i]);
                            }
                            counter++;
                            if (counter === 3){
                                similarMovies.push(moviesObj[i]);
                            }
                        }
                    }
                }
                if (similarMovies.length === 3){
                    break;
                }
            }
            res.format({
                'text/html': function(){
                    res.render("movieid.pug", {movie: curMovie, session: req.session, similar:  similarMovies});
                },
                'application/json': function (){
                    res.send(curMovie);
                }   
            })
            res.status(200);
            return;
        }
    }


    if (moviesObj.hasOwnProperty(movieId)){
        for (i = Math.floor(Math.random() * 5000); i < Object.keys(moviesObj).length; i++){
            let counter = 0;
            if (moviesObj[movieId].title != moviesObj[i].title){
                for (let j in moviesObj[i].genre){
                    if (moviesObj[movieId].genre.includes(moviesObj[i].genre[j])){
                        if (moviesObj[movieId].genre.length < 3){
                            similarMovies.push(moviesObj[i]);
                        }
                        else{
                            counter++;
                            if (counter === 3){
                                similarMovies.push(moviesObj[i]);
                            }
                        }
                    }
                }
                if (similarMovies.length === 3){
                    break;
                }
            }
        }
        res.format({
            'text/html': function(){
                res.render("movieid.pug", {movie: moviesObj[movieId], session: req.session, similar:  similarMovies});
            },
            'application/json': function (){
                res.send(moviesObj[movieId]);
            }   
        })
        res.status(200);
    }
    else{
        res.status(404).send("Invalid ID");
    }
}

//Sets the coming in queries to correct params
function parseQueryPerson (req, res, next){
    req.properParams = {};

    if (req.query.name != null){
        req.properParams.name = req.query.name.toLowerCase();
    }
    next();
}
//Gets people page, if there are queries then it searchs within the queries
//If no query then all people are printed, if query makes no sense then no people get printed
function getPeople(req, res){
    let returnPeople = [];

    for (let id in peopleObj){
        let curPerson = peopleObj[id];

        let findPerson = ((!req.properParams.name) || (curPerson.name.toLowerCase().includes(req.properParams.name)));

        if (findPerson){
            returnPeople.push(curPerson);
        }
    }
    res.format({
        'text/html': function(){
            returnPeople = returnPeople.splice(0, 250);
            if (returnPeople.length === null){
                res.status(404).send(JSON.stringify(returnPeople));
            }
            else{
                res.render('people.pug', {peopleObj: returnPeople, session: req.session});
                res.status(200);
            }
        },
        'application/json': function (){
            returnPeople = returnPeople.splice(0, 250);
            if (returnPeople.length === null){
                res.status(404).send(JSON.stringify(returnPeople));
            }
            else{
                res.status(200).send(JSON.stringify(returnPeople));
            }
        }
    })
}
//Gets individual person with a movie ID
//Also creates frequent collaborations with actors
function getPerson(req, res){
    let personId = req.params.personid;
    req.session.url = personId;
    let written = [];
    let directed = [];
    let acted = []
    if (peopleObj.hasOwnProperty(personId)){
        if (peopleObj[personId].written.length){
            for (let id in moviesObj){
                for (var i = 0; i<peopleObj[personId].written.length; i++){
                    if (peopleObj[personId].written[i] == moviesObj[id].id){
                        written.push(moviesObj[id]);
                    }
                }
            }
        }
        if (peopleObj[personId].directed.length){
            for (let id in moviesObj){
                for (i = 0; i<peopleObj[personId].directed.length; i++){
                    if (peopleObj[personId].directed[i] == moviesObj[id].id){
                        directed.push(moviesObj[id]);
                    }
                }
            }
        }
        if (peopleObj[personId].acted.length > 0){
            for (let id in moviesObj){
                for (i = 0; i<peopleObj[personId].acted.length; i++){
                    if (peopleObj[personId].acted[i] == moviesObj[id].id){
                        acted.push(moviesObj[id]);
                    }
                }
            }
        }
        personId = req.params.personid;
        let len = Object.keys(peopleObj).length;
        peopleObj[personId].freqCollabs = [];
        let x = 0;
        let counter = 0;
        while (x<len){
            if (peopleObj[x].acted.length>0){
                for (let act in peopleObj[x].acted){
                    if (peopleObj[personId].acted.includes(peopleObj[x].acted[act]) && peopleObj[personId].name !== peopleObj[x].name){
                        if (peopleObj[personId].freqCollabs.includes(peopleObj[x].name)){
                            continue;
                        }
                        else{
                            peopleObj[personId].freqCollabs.push(peopleObj[x].name);
                            counter++
                        }
                    }
                    if (counter>3){
                        break;
                    }
                }
            }
            if (counter>3){
                break;
            }
            x++;
        }
        res.format({
            'text/html': function(){
                res.render("personid.pug", {person: peopleObj[personId], mov1: directed, mov2: written, mov3: acted, session: req.session});
            },
            'application/json': function (){
                res.send(peopleObj[personId]);
            }   
        })
        res.status(200);
    }
    else{
        res.status(404).send("Invalid ID");
    }
}
//Sets the coming in queries to correct params
function parseQueryUser (req, res, next){
    req.properParams = {};
    if (req.query.username != null){
        req.properParams = req.query.username.toLowerCase();
    }
    next();
}
//Gets users page, if there are queries then it searchs within the queries
//If no query then all uesrs are printed, if query makes no sense then no users get printed
function getUsers(req, res){
    if (Object.keys(req.properParams).length === 0){
        res.render('users.pug', {users: users, session: req.session});
        return;
    }
    let returnUsers = [];
    users.forEach(u =>{
        let curUser = u;

        let findPerson = ((!req.properParams) || (curUser.username.includes(req.properParams)));
        if (findPerson){
            returnUsers.push(curUser);
        }
    })
    res.format({
        'text/html': function(){
            if (returnUsers.length === null){
                res.status(404).send(JSON.stringify(returnUsers));
            }
            else{
                res.render('users.pug', {users: returnUsers, session: req.session});
            }
        },
        'application/json': function (){
            if (returnUsers.length === null){
                res.status(404).send(JSON.stringify(returnUsers));
            }
            else{
                res.status(200).send(JSON.stringify(returnUsers));
            }
        }
    })
}
//Gets individual person with a movie ID
//Also creates reccomended movies based on who the user follows.
function getSingleUser(req, res){
    let userId = req.params.userid;
    if (userId>users.length-1){
        res.status(404).send("User ID " + userId + " Doesn't exist")
        return;
    }
    req.session.url = userId;

    let i = 0;
    let len = Object.keys(moviesObj).length;
    let recMovies = [];
    let counter = 0;
    while (i<len){
        for (let person in users[userId].follows){
            if (moviesObj[i].directors.includes(users[userId].follows[person]) || moviesObj[i].writers.includes(users[userId].follows[person]) || moviesObj[i].actors.includes(users[userId].follows[person])){
                recMovies.push(moviesObj[i]);
                counter++;
            }
        }
        if (counter === 3){
            break;
        }
        i++;
    }

    if (users.hasOwnProperty(userId)){
        res.format({
            'text/html': function(){
                res.render("userid.pug", {user: users[userId], session: req.session, recMov: recMovies});
            },
            'application/json': function (){
                res.send(users[userId]);
            }   
        })
        res.status(200);
    }
    else{
        res.status(404).send("Invalid ID");
    }
}
//Checks if user exists in the database
function userExists(newUser){
    for (var i = 0; i<users.length; i++){
        if (users[i].username === newUser.username){
            return true;
        }
        if (users[i].username === newUser){ // Used for my follow user to check if name equals to users name.
            return true;
        }
    }
}
//log in function, logs in the user, if the user enters correct username and password
function login(req, res){
    if (req.session.loggedin){
        res.status(401).send("Already logged in");
    }
    else{
        let username = req.body.username;
        let password = req.body.password;
        let auth = true;
        users.forEach (u=> {
        if (username === u.username && password === u.password){
            auth = false;
            req.session.username = username;
            req.session.loggedin = true;
            req.session.user = u;
            res.status(200).redirect(`/users/${u.id}`);
        }
    })
        if (auth){
            res.status(401).send("The Username and passwords entered were incorrect");
        }
    }
}
//Log out function, to log out a currnet loggedin user. 
//Also destroys the session
function logout(req, res) {
    if(req.session.loggedin) {
        req.session.loggedin = false;
        req.session.destroy();
    }
    res.redirect("/users")
}
//signup function, if username doesn't exist then new account being created if form is correct 
function createUser(req, res){
    if (req.method == "GET"){
        if (req.session.loggedin){
            res.status(401).send("Already logged in");
            return;
        }
        res.render("login.pug");
    }
    else if (req.method == "POST"){
        let newUser = req.body;
        if(newUser.username === '' || newUser.password === ''){
            res.status(304).redirect("/signup");
          }
        else if(userExists(newUser)){
            res.status(404).send("The username you provided already exists in the system, enter a different username");
          }
        else{
            newUser.follows = [];
            newUser.followers = [];
            newUser.reviews = []
            newUser.bio = "";
            newUser.id = users[users.length-1].id + 1;
            users.push(newUser);
            res.status(201).redirect(`/users/${newUser.id}`);
        }
    }
}
//Switches between being a contributor and not being a contributor
function switchContributer(req, res){
    let userLog = req.session;
    if (userLog.loggedin === true){
        users.forEach(u=>{
            if (u.username === userLog.username){
                if (u.contributer === false){
                    u.contributer = true;
                    userLog.user.contributer = true;
                }
                else{
                    u.contributer = false;
                    userLog.user.contributer = false;
                }
                res.status(200).redirect('/users')
            }
        })
    }
    else{
        res.status(404).send("You are not logged in")
    }
}
//Adds a movie with a form, only a contributor user is authrozied to do this
function addMovie(req, res){
    if (req.method === "GET"){
        res.render('addmovie.pug', {session: req.session});
    }
    
    else if (req.method === "POST"){
        let movieTitle = req.body.movieTitle;
        let moviePlot = req.body.moviePlot;
        let movieYear = req.body.movieYear;
        let movieRunTime = req.body.movieRunTime;
        let movieActors = req.body.movieActors;
        let movieWriters = req.body.movieWriters;
        let movieDirectors = req.body.movieDirectors;
        let movieGenre = req.body.movieGenre;
        let movieCountry = req.body.movieCountry;
        let movieId = Object.keys(moviesObj).length;
        if (movieExists(movieTitle)){
            res.status(406).send("Movie that you are trying to add already exists");
            return;
        }
        if (movieTitle === '' || movieActors === '' || movieDirectors == '' || movieWriters == '' || movieGenre === ''){
             res.status(406).send("You are missing one of the requirements");
        }
        else{
            movieActors = movieActors.split(", ");
            movieWriters = movieWriters.split(", ");
            movieDirectors = movieDirectors.split(", ");
            movieGenre = movieGenre.split(", ");
            for (var i = 0; i<movieActors.length; i++){
                if (!personExists(String(movieActors[i]))){
                    peopleObj[Object.keys(peopleObj).length] = {"id":[Object.keys(peopleObj).length],
                    "name":movieActors[i],"directed":[],"written":[],"acted":[movieId],"freqCollabs":[],"followers":[],"bio":"","pic":""};
                }
                else{
                    let len = Object.keys(peopleObj).length
                    var j = 0
                    while(j<len){
                        if (peopleObj[j].name === movieActors[i]){
                            peopleObj[j].acted.push(String(movieId));
                        }
                        j++;
                    }
                }
            }
            for (i = 0; i<movieWriters.length; i++){

                if (!personExists(String(movieWriters[i]))){
                    peopleObj[Object.keys(peopleObj).length] = {"id":[Object.keys(peopleObj).length],
                    "name":movieWriters[i],"directed":[],"written":[movieId],"acted":[],"freqCollabs":[],"followers":[],"bio":"","pic":""};
                }
                else{
                    let len = Object.keys(peopleObj).length
                    var j = 0
                    while(j<len){
                        if (peopleObj[j].name === movieWriters[i]){
                            peopleObj[j].written.push(String(movieId));
                        }
                        j++
                    }
                }
            }
            for (i = 0; i<movieDirectors.length; i++){
                if (!personExists(String(movieDirectors[i]))){
                    peopleObj[Object.keys(peopleObj).length] = {"id":[Object.keys(peopleObj).length],
                    "name":movieDirectors[i],"directed":[movieId],"written":[],"acted":[],"freqCollabs":[],"followers":[],"bio":"","pic":""};
                }
                else{
                    let len = Object.keys(peopleObj).length
                    j = 0;
                    while (j<len){
                        if (peopleObj[j].name === movieDirectors[i]){
                            peopleObj[j].directed.push(String(movieId));
                            for (i = 0; i<req.session.user.followers.length; i++){
                                let notifeUser = req.session.user.followers[i];
                                for (j = 0; j<users.length; j++){
                                    if (notifeUser === users[j].username){
                                        users[j].notifications.push(peopleObj[j].name + " has been added to a new movie ");
                                    }
                                }
                            }
                        }
                        j++
                    }
                }
            }
            moviesObj[movieId] = {"id":movieId, "title": movieTitle,
            "averageRating": 0, "year": movieYear, "runtime": movieRunTime, "genre": movieGenre,
            "directors": movieDirectors, "actors": movieActors, "writers": movieWriters, "plot":moviePlot, "country": movieCountry, "reviews": []};
            res.status(201).redirect('/movies');
        }
    }
}

//To check if given movie is in the movie array
function movieExists(movie){
    for (var id in moviesObj){
        if (moviesObj[id].title.toLowerCase() === movie.toLowerCase()){
            return true;
        }
        return false;
    }
}

//Removes Movie if the movie given exists
//Only authorized users allowed to do this
function removeMovie(req , res){
    if (req.session.loggedin && req.session.user.contributer){
        if (req.method == "GET"){
            res.render('addmovie.pug', {session: req.session});
        }
        
        else if (req.method === "POST"){
            let movieToRemove = req.body.movieToRemove;
            if ((movieExists(movieToRemove))){
                for (var id in moviesObj){
                    if (moviesObj[id].title.toLowerCase() === movieToRemove.toLowerCase()){
                        delete moviesObj[id]
                        res.status(200).redirect('/movies');
                    }
                }
            }
            else{
                res.status(404).send("Movie that you are trying to remove doesn't exist");
            }
        }
    }
    else{
        res.status(401).send("You are not a contributer and/or you are not signed in");
    }
}

//Edit function, edits movies, ability to edit movie details
//only authorized user is allowed to do this
function editMovie(req, res){
    let id = req.session.url1;

    if (req.session.loggedin && req.session.user.contributer){
        if (req.method === "GET"){
            res.render('editmovie.pug', {movie: moviesObj[id], session: req.session});
        }
        else if (req.method === "POST"){
            let movieTitle = req.body.movieTitle;
            let moviePlot = req.body.moviePlot;
            let movieYear = req.body.movieYear;
            let movieRunTime = req.body.movieRunTime;
            let movieCountry = req.body.movieCountry;
            if (movieTitle === ''){
                res.status(406).send("You are missing one of the requirements");
            }
            else{
                moviesObj[id].title = movieTitle;
                moviesObj[id].plot = moviePlot;
                moviesObj[id].year = movieYear;
                moviesObj[id].runtime = movieRunTime;
                moviesObj[id].country = movieCountry
                res.status(201).redirect('/movies/'+id);
                }
            }
        else{
            res.status(401).send("You are not a contributer and/or you are not signed in"); 
        }
    }
}

//function to add actor to the current movie editing
//only authorized users allowed to do this
function addActor(req, res){
    let newActor = req.body.newActor;
    let movieId = req.session.url1;
    let len = Object.keys(peopleObj).length
    let j = 0;
    if (personExists(newActor)){
        for (var i = 0; i<Object.keys(moviesObj).length; i++){
            if (moviesObj[i].id == movieId){
                moviesObj[i].actors.push(newActor);
                while(j<len){
                    if (peopleObj[j].name.toLowerCase() === newActor.toLowerCase()){
                        peopleObj[j].acted.push(movieId)
                        for (i = 0; i<req.session.user.follows.length; i++){
                            if (req.session.user.follows[i].toLowerCase() === newActor.toLowerCase()){
                                for (var x = 0; x<users.length; x++){
                                    if (req.session.username === users[x].username){
                                        console.log(newActor + " has been added to the movie: " + moviesObj[i].title);
                                        users[x].notifications.push(newActor + " has been added to the movie: " + moviesObj[i].title);
                                    }
                                }
                            }
                        }
                    }
                    j++;
                }
            }
        }
    }
    else{
        peopleObj[Object.keys(peopleObj).length] = {"id":[Object.keys(peopleObj).length],
        "name":newActor,"directed":[],"written":[],"acted":[movieId],"freqCollabs":[],"followers":[],"bio":"","pic":""};
        for (i = 0; i<Object.keys(moviesObj).length; i++){
            if (moviesObj[i].id == movieId){
                moviesObj[i].actors.push(newActor);
            }
        }
    }
    res.status(201).redirect('/movies/'+movieId);
}

//function to add director to the current movie editing
//only authorized users allowed to do this
function addDirector(req,res){
    let newDirector = req.body.newDirector;
    let movieId = req.session.url1;
    let len = Object.keys(peopleObj).length
    let j = 0;
    if (personExists(newDirector)){
        for (var i = 0; i<Object.keys(moviesObj).length; i++){
            if (moviesObj[i].id == movieId){
                moviesObj[i].directors.push(newDirector);
                while (j<len){
                    if (peopleObj[j].name.toLowerCase() === newDirector.toLowerCase()){
                        peopleObj[j].directed.push(movieId)
                        for (i = 0; i<req.session.user.follows.length; i++){
                            if (req.session.user.follows[i].toLowerCase() === newDirector.toLowerCase()){
                                for (var x = 0; x<users.length; x++){
                                    if (req.session.username === users[x].username){
                                        console.log(newDirector + " has been added to the movie: " + moviesObj[i].title);
                                        users[x].notifications.push(newDirector + " has been added to the movie: " + moviesObj[i].title);
                                    }
                                }
                            }
                        }
                        res.status(201).redirect('/movies/'+movieId);
                    }
                    j++;
                }
            }
        }
    }
    else{
        peopleObj[Object.keys(peopleObj).length] = {"id":[Object.keys(peopleObj).length],
        "name":newDirector,"directed":[movieId],"written":[],"acted":[],"freqCollabs":[],"followers":[],"bio":"","pic":""};
        for (i = 0; i<Object.keys(moviesObj).length; i++){
            if (moviesObj[i].id == movieId){
                moviesObj[i].directors.push(newDirector);
                res.status(201).redirect('/movies/'+movieId);
            }
        }
    }
}

//function to add writer to the current movie editing
//only authorized users allowed to do this
function addWriter(req,res){
    let newWriter = req.body.newWriter;
    let movieId = req.session.url1;
    let len = Object.keys(peopleObj).length
    let j = 0;
    if(personExists(newWriter)){
        for (var i = 0; i<Object.keys(moviesObj).length; i++){
            if (moviesObj[i].id == movieId){
                moviesObj[i].writers.push(newWriter);
                while (j<len){
                    if (peopleObj[j].name.toLowerCase() === newWriter.toLowerCase()){
                        peopleObj[j].written.push(movieId)
                        for (i = 0; i<req.session.user.follows.length; i++){
                            if (req.session.user.follows[i].toLowerCase() === newWriter.toLowerCase()){
                                for (var x = 0; x<users.length; x++){
                                    if (req.session.username === users[x].username){
                                        console.log(newWriter + " has been added to the movie: " + moviesObj[i].title);
                                        users[x].notifications.push(newWriter + " has been added to the movie: " + moviesObj[i].title);
                                    }
                                }
                            }
                        }
                        res.status(201).redirect('/movies/'+movieId);
                    }
                    j++;
                }
            }
        }
    }
    else{
        peopleObj[Object.keys(peopleObj).length] = {"id":[Object.keys(peopleObj).length],
        "name":newWriter,"directed":[],"written":[movieId],"acted":[],"freqCollabs":[],"followers":[],"bio":"","pic":""};
        for (i = 0; i<Object.keys(moviesObj).length; i++){
            if (moviesObj[i].id == movieId){
                moviesObj[i].writers.push(newWriter);
                res.status(201).redirect('/movies/'+movieId);
                return;
            }
        }
    }
}

//Follows Person only for logged in users
function followPerson(req, res){
    let user = req.session.user;
    const id = req.session.url;
    for (var i in users){
        if (req.session){
            if (user.username === users[i].username){
                user = users[i]
            }
        }
    }
    for (var j in peopleObj){
        if (peopleObj[j].id == id && !(user.follows.includes(peopleObj[j].name))){
            user.follows.push(peopleObj[j].name);
            req.session.user.follows.push(peopleObj[j].name);
            peopleObj[j].followers.push(user.username);
            res.status(200).redirect('/people/'+id);
            break;
        } 
    }
}

//Follows Other User only for logged in users
function followUser(req,res){
    let user = req.session.user;
    let user1;
    const id = req.session.url;
    for (var i in users){
        if (req.session){
            if (user.username === users[i].username){
                user = users[i]
            }
        }
        if (users[i].id == id && !(user.follows.includes(users[i]))){
            user1 = users[i];
            user.follows.push(user1.username);
            req.session.user.follows.push(user1.username);
            user1.followers.push(user.username);
            res.status(200).redirect('/users/'+id);
            break;
        }
    }
}

//Unfollows other user only for logged in users
function unfollowUser(req, res){
    let user = req.session.user;
    let user1;
    const id = req.session.url;
    for (var i in users){
        if (session){
            if (user.username === users[i].username){
                user = users[i]
            }
        }
        if (users[i].id == id && !(user.followers.includes(users[i]).username)){
            user1 = users[i];
            let index = user.follows.indexOf(users[i].username);
            user.follows.splice(index, 1);
            req.session.user.follows.splice(index, 1);
            let index2 = user1.followers.indexOf(user.username);
            user1.followers.splice(index2, 1);
            res.status(200).redirect('/users/'+id);
            break;
        }
    }
}
//Unfollows Person only for logged in users
function unfollowPerson(req, res){
    let user = req.session.user;
    const id = req.session.url;
    for (var i in users){
        if (session){
            if (user.username === users[i].username){
                user = users[i]
            }
        }
    }
    for (var j in peopleObj){
        if (peopleObj[j].id == id && !(user.followers.includes(peopleObj[j].name))){
            let index = user.follows.indexOf(peopleObj[j].name);
            user.follows.splice(index, 1);
            req.session.user.follows.splice(index, 1);
            let index2 = peopleObj[j].followers.indexOf(user.username);
            peopleObj[j].followers.splice(index2, 1);
            res.status(200).redirect('/people/'+id);
            break;
        } 
    }
}

//Checks if person exists
function personExists(person){
    let len = Object.keys(peopleObj).length;
    let id = 0;
    while (id < len){
        if (person.toLowerCase() === peopleObj[id].name.toLowerCase()){
            return true;
        }
        id++;
    }
    return false;
}

//Ability to add a new person to the database
//only contributor users allowed to do this
function addPerson(req, res){
    if (req.session.loggedin && req.session.user.contributer){
        if (req.method == "GET"){
            res.render('addPerson.pug', {session: req.session});
        }
        
        else if (req.method === "POST"){
            let personAdd = req.body.personAdd;
            if (!personExists(personAdd)){
                let id = Object.keys(peopleObj).length
                peopleObj[id] = {"id":id, "name": personAdd,"directed":[],"written":[],"acted":[],"freqCollabs":[],"followers":[],"bio":"","pic":""};
                res.status(200).redirect('/people');
                return;
            }
            else{
                res.status(400).send("Person that you are trying to add already exists");
                return;
            }
        }
    }
    else{
        res.status(401).send("You are not a contributer and/or you are not signed in");
    }
}

//function to add a basic review out of 5
//only for loggedin users
function addReview(req, res){
    let id = req.session.url1;
    let counter = moviesObj[id].reviews.length
    if (req.session && req.session.loggedin){
        if (req.method === "GET"){
            res.render('addreview.pug', {movie: moviesObj[id], session: req.session});
        }  
        else if (req.method === "POST"){
            let rate = req.body.review;
            if (!isNaN(rate) && Number(rate) >= 0 && Number(rate) <= 5){
                moviesObj[id].reviews[counter++] = {"rate": rate};
                moviesObj[id].averageRating = (moviesObj[id].averageRating + Number(rate)) / counter;
                req.session.user.reviews[counter] = {"rate": rate};
                for (let usr in users){
                    if (users[usr].username === req.session.username){
                        users[usr].reviews[counter] = {"movie":moviesObj[id].title, "rate": rate, "detailedReview":""};
                    }
                }
                for (var i = 0; i<req.session.user.followers.length; i++){
                    let notifeUser = req.session.user.followers[i];
                    for (var j = 0; j<users.length; j++){
                        if (notifeUser === users[j].username){
                            console.log(req.session.username + " added a detailed review to the movie: " + moviesObj[id].title);
                            users[j].notifications.push(req.session.username + " added a review to the movie: " + moviesObj[id].title);
                        }
                    }
                }
                res.status(201).redirect('/movies/'+id);
            }
            else{
                res.status(400).send("Please enter a Number (0-5)");
            }
        }
    }
}

//function to add a detailed review with a number /5 and a text form
//only for loggedin users
function addDetailedReview(req, res){
    let id = req.session.url1;
    let counter = moviesObj[id].reviews.length
    if (req.session && req.session.loggedin){
        if (req.method === "GET"){
            res.render('addreview.pug', {movie: moviesObj[id], session: req.session});
        }  
        else if (req.method === "POST"){
            let rate = req.body.review;
            let detailed = req.body.detReview
            if (!isNaN(rate) && Number(rate) >= 0 && Number(rate) <= 5 && detailed !== ""){
                moviesObj[id].reviews[counter++] = {"rate": rate, "detailed":detailed};
                moviesObj[id].averageRating = (moviesObj[id].averageRating + Number(rate)) / counter;
    
                for (var i = 0; i<req.session.user.followers.length; i++){
                    let notifeUser = req.session.user.followers[i];
                    for (var j = 0; j<users.length; j++){
                        if (notifeUser === users[j].username){
                            console.log(req.session.username + " added a detailed review to the movie: " + moviesObj[id].title);
                            users[j].notifications.push(req.session.username + " added a detailed review to the movie: " + moviesObj[id].title);
                        }
                    }
                }
                res.status(201).redirect('/movies/'+id);
            }
            else{
                res.status(400).send("Please enter a Number (0-5) and Add text in text box");
            }
        }
    }
}

//function to get password if you forgot it
function forgotpw(req,res){
    if (req.session.loggedin){
        res.status(404).send("You are already logged in");
        return;
    }
    if (req.method === "GET"){
        res.render('forgotpw.pug');
    } 
    else if (req.method === "POST"){
        let username = req.body.username
        for (var i = 0; i<users.length; i++){
            if (users[i].username === username){
                res.status(401).send("Your password is " + users[i].password);
            }
        }
        if (!userExists(username)){
            res.status(400).send("This user doesn't exist");
        }
        if(username === ''){
            res.status(400).send("Please enter a valid username and password");
        }
    } 
}

//function to create password if you forgot it
function createpw(req, res){
    let username = req.body.username;
    let password = req.body.password;
    if(username === '' || password === ''){
        res.status(400).send("Please enter a valid username and password");
    }
    else if (!userExists(username)){
        res.status(400).send("This user doesn't exist");
    }
    else{
        for (var i = 0; i<users.length; i++){
            if (users[i].username === username){
                users[i].password = password;
                res.status(200).redirect('/login');
            }
        }
    }
}
app.listen(3000);
console.log("Server Listening at http://localhost:3000");
