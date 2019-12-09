'use strict';

const {hashString} = require('../utils');

class User {
    constructor(request, email, password) {
        this.data = {
            email: email,
            password: hashString(password, 'md5'),
            login: {
                browser: [request.header('User-Agent')]
            },
            tokens: []
        }
    }

    get getData() {
        return this.data;
    }
}

module.exports = User;