module.exports = {
    debug: true,

    service: {
        token: '1',
        url: `http://localhost:8000/api/echo/`,
    },

    redis: {
        host: 'localhost',
        port: 6379,
    },

    io: {
        port: 3000,
    }
};