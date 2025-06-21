const express = require('express');
const path = require('path');
require('dotenv').config();
// added session and cookies
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();

// session config
app.use(
    session({
        secret: 'dogWalking',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 

        }
        }
    })
)

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));
// added this so my html forms can be read by my routers (parses into a JS object)
app.use(express.urlencoded({ extended: false }));
// aded this so my app can use cookies
app.use(cookieParser());

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;