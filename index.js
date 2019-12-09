'use strict';

const config = require('./config');
const app = require('express')();
const cookieSession = require('cookie-session');
const validator = require('validator');
const bodyParser = require('body-parser');
const User = require('./models/User');
const {db, hashString, hasSameBrowser, authCode} = require('./utils');
const Email = require('./classes/Email');

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieSession({
    name: 'login-token',
    keys: ['UgCY22Hm9bjG', 'nwYJAP58n6bj']
}));

app.get('/', (req, res) => {
    if(req.session.user) {
        res.render('index', {
            title: 'Welcome'
        });
    } else {
        res.render('login-signup', {
            title: 'Login or Sign Up'
        });
    }    
});

app.get('/logout', (req, res) => {
    if(req.session.user) {
        delete req.session.user;
    }
    res.redirect('/');
});

app.post('/signup', async (req, res) => {
    if(typeof req.app.locals.signupErrors === 'object') {
        delete req.app.locals.signupErrors;
    }

    const {email, password} = req.body;
    let errors = {};
    let hasError = false;

    if(!validator.isEmail(email)) {
        errors.email = 'Invalid email.';
        hasError = true;
    }

    if(validator.isEmpty(password)) {
        errors.password = 'Invalid password.';
        hasError = true; 
    }

    if(hasError) {
        req.app.locals.signupErrors = errors; 
    } else {
        try {
            const client = await db(config.dbUrl);
            const database = client.db(config.dbName);
            const users = database.collection('users');
            const existingUser = await users.findOne({email});
            
            if(!existingUser) {
                const newUser = new User(req, email, password);
                await users.insertOne(newUser.getData);
            }

        
        } catch(err) {
            res.send(err);
            return;
        }
        
    }

    res.redirect('/');
});

app.post('/login', async (req, res) => {
    if(typeof req.app.locals.loginError === 'string') {
        delete req.app.locals.loginError;
    }

    const data = req.body;

    try {
        const client = await db(config.dbUrl);
        const database = client.db(config.dbName);
        const users = database.collection('users');
        const existingUser = await users.findOne({email: data.email, password: hashString(data.password, 'md5')});
        
        if(!existingUser) {
            req.app.locals.loginError = 'Invalid login.'; 
        } else {
            if(hasSameBrowser(req, existingUser.login.browser)) {
                req.session.user = data.email;
            } else {
                const code = authCode();
                const email = new Email(config.mailFrom, config.mailSettings);

                await users.findOneAndUpdate({email: data.email}, { $push: { tokens: code } });
                await email.send({ to: data.email, subject: 'Verification code', body: `Your verification code: ${code}` });

                return res.render('auth', {
                    title: 'Verification required'
                });
            }    
        }

    
    } catch(err) {
        res.send(err);
        return;
    }

    res.redirect('/');
});

app.post('/auth', async (req, res) => {
    if(typeof req.app.locals.authError === 'string') {
        delete req.app.locals.authError;
    }

    const {token} = req.body;

    try {
        const client = await db(config.dbUrl);
        const database = client.db(config.dbName);
        const users = database.collection('users');
        const existingUser = await users.findOne({ tokens: { $in: [ token ]}});
        
        if(!existingUser) {
            req.app.locals.authError = 'Invalid verification code.'; 
        } else {
            await users.findOneAndUpdate({ tokens: { $in: [ token ]}}, { $push: {'login.browser': req.header('User-Agent')}});
            req.session.user = existingUser.email;
        }

    
    } catch(err) {
        res.send(err);
        return;
    }

    res.redirect('/');
});


app.listen(3000);