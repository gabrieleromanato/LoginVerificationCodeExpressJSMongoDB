'use strict';

module.exports = {
    dbUrl: 'mongodb://localhost:27017',
    dbName: 'db',
    mailFrom: 'your@email.com',
    mailSettings: {
        host: 'locahost',
        port: 465,
        secure: true,
        auth: {
            user: 'username',
            pass: 'password'
        }
    },
};