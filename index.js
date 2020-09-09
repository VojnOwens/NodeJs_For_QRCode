require("dotenv").config();

const express = require('express');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { base64encode, base64decode } = require('nodejs-base64');
const session = require('express-session');
const passport = require('passport');
const { query } = require("express");

const app = express();


//connect db

var connection = mysql.createConnection({
    host: 'sql7.freemysqlhosting.net',
    user: 'sql7613461',
    password: 'XwP69cqyMT',
    database: 'sql7613461'
});

connection.connect(function(err){       
    
    if(err){
        console.error('DB connection failed.');
        throw err;
    }
    connection.query("CREATE TABLE IF NOT EXISTS tbl_user(id VARCHAR(255), name VARCHAR(255), email VARCHAR(255),link VARCHAR(255), photo VARCHAR(255))", 
        function(err, result){
            if(err) throw err;
    });
        
    console.log ('conndected as id ' + connection.threadId);    
});



app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'SECRET' 
}));

app.get('/auth', function(req, res) {
  res.render('pages/auth');
});


var userProfile;

app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
  
//add user
const addUser = (user) =>{
    connection.query(`Select * From tbl_user Where email='${user.email}' or id='${user.id}'`, function(err, result){
        if(err) throw err;
        if(result.length == 0){
            connection.query(`Insert Into tbl_user values('${user.id}', '${user.name}', '${user.email}', '${user.link}', '${user.photo}')`, function(err){
                if(err) throw err;
            });
        }
    });
}

app.get('/success', (req, res) => {
  
  //res.redirect("/detail?id=" + user.id);
});
app.get('/error', (req, res) => res.send("error logging in"));


/*  passport */

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

/*  Google AUTH  */

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '605759139637-bgcfrjkm6vgikt0hq9tpic6p29ien02d.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "https://qr-node-test.onrender.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));
 


app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.  
    var user = {};
    user.id = userProfile.id;
    user.name=userProfile.displayName;
    user.email = userProfile.emails[0].value;
    user.photo = userProfile.photos[0].value;
    user.link = "";
    addUser(user, res);
    res.setHeader("set-cookie", [`id=${user.id}`]); 
    res.redirect("/detail?id=" + user.id);
  });

var ret = [];
//@desc GET /
app.get('/', function(req, res){
    ret = [];
    connection.query('Select * From tbl_user', function(err, result){
        if(err) throw err;
        
        for(var row of result){
            ret.push({id: row.id, name: row.name, email: row.email, link: row.link, photo: row.photo, });
        }
        //console.log(ret);
        res.render('index', {Users: ret});
    });
});


//@desc GET /detail
app.get('/detail', function(req, res){
  
    const id = (req.cookies.id == "" || req.cookies.id == undefined) ? req.query.id: req.cookies.id;

    connection.query(`SELECT * FROM tbl_user WHERE id='${id}'`, function(err, result){
        
        if(err) throw err;
        
        if (result.length != 0) {
            const link = result[0].link;
            res.setHeader("set-cookie", [`id=${id}`]);
            if(link == "" || link == undefined){  
              const user = {id: result[0].id, name: result[0].name, email: result[0].email, photo: result[0].photo};
              //console.log("user", user);
              res.render('detail', {user: user});
            }
            else{
              res.redirect(link);
            }
        } else {
            res.redirect("/auth/google");
        }
    })
})

app.post('/savelink', function(req, res){
    const id = req.body.id;
    const link = req.body.link;
    connection.query(`Update tbl_user Set link='${link}' Where id='${id}'`, function(err, result){
      if(err) throw err;
      res.send({success: true}); 
    })    
})

app.post('/', function(req, res){
   
    const user = req.body;
    if(user.email == ""|| user.email == undefined) res.redirect("/");
    addUser(user);
    res.redirect("/");    
})

app.listen(3000,function(){
	console.log('Server listing on 3000');
});
