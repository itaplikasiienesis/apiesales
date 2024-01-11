const Axios = require("axios");

const instance = Axios.create({
    baseURL: sails.config.globals.apiURL,
});

instance.interceptors.request.use((config) => {
    config = {
        ...config,
        headers: {
            ...config.headers
        }
    }

    console.log(config.headers);
    if (config.method.toUpperCase() === 'GET') {
        delete config.headers['X-CSRF-TOKEN'];        
    }

    if (config.method.toUpperCase() === 'POST') {
        delete config.headers['X-CSRF-TOKEN'];        
    }

    if (config.method.toUpperCase() === 'PUT') {
        delete config.headers['X-CSRF-TOKEN'];        
    }

    if (config.method.toUpperCase() === 'DELETE') {
        delete config.headers['X-CSRF-TOKEN'];        
    }

    delete config.headers.common['X-Requested-With'];

    return config;
});

const api = instance;

module.exports = api;