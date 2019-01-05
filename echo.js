var config = require('./config');
var io = require('socket.io')();
var axios = require('axios');
var redis = require("redis"),
    pub = redis.createClient({host: config.redis.host, port: config.redis.port}),
    sub = redis.createClient({host: config.redis.host, port: config.redis.port});

function findClientByIp(address) {
    for(var sockId in io.sockets.sockets) {
        var socket = io.sockets.sockets[sockId];
        var remoteAddress = socket.request.connection.remoteAddress;

        if (remoteAddress == address) return socket;
    }
}

function getServiceUrl() {
    return config.service.url + config.service.token;
}

io.on('connection', function(client) {
    if (typeof client.handshake.headers['token'] === 'undefined') {
        client.disconnect();
    }

    var ip = client.request.connection.remoteAddress;
    var token = client.handshake.headers['token'];

    if (config.debug) ip = '127.0.0.1';

    axios.post(getServiceUrl() + '/connect', {
        ip: ip,
        token: token
    }).then(function(res) {
        if (res.status === 200 && res.data.ok === true) {
            console.log(`Success Auth: ${ip}`)
        } else {
            console.log(`Error: ${res.data.message}`);
            client.disconnect();
        }
    }).catch(function(error) {
        console.log(`Error: ${error.response.status}`);
        client.disconnect();
    });

    client.on('CreateAccess', function(data) {
        axios.post(getServiceUrl() + '/create-access', {
            ip: ip,
            data: JSON.stringify(data),
        });
    });

    client.on('DeleteAccess', function(data) {
        axios.post(getServiceUrl() + '/delete-access', {
            ip: ip,
            data: JSON.stringify(data),
        });
    });

    client.on('disconnect', function() {
        axios.post(getServiceUrl() + '/disconnect', {
            ip: ip,
        });
    });
});

sub.on('message', function(channel, message) {
    if (config.debug) console.log(channel, message);

    try {
        message = JSON.parse(message);
    } catch(e) {
        return;
    }

    if (config.debug) {
        var client = findClientByIp('::ffff:127.0.0.1');
    } else {
        var client = findClientByIp(message.data.ip);
    }

    if (client === undefined) {
        axios.post(getServiceUrl() + '/not-connected', {
            ip: message.data.ip,
            data: JSON.stringify(message),
        });

        return;
    }

    client.emit(message.event, message);
});

sub.subscribe('Access');

io.listen(config.io.port);