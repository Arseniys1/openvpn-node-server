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

    var token = client.handshake.headers['token'];

    axios.post(getServiceUrl() + '/connect', {
        ip: client.request.connection.remoteAddress,
        token: token
    }).then(function(res) {
        console.log(res);
    }).catch(function(error) {
        //client.disconnect();
    });

    client.on('.CreateAccess', function(data) {
        axios.post(getServiceUrl() + '/create-access', data);
    });

    client.on('.DeleteAccess', function(data) {
        axios.post(getServiceUrl() + '/delete-access', data);
    });

    client.on('disconnect', function() {
        axios.post(getServiceUrl() + '/disconnect', {
            ip: client.request.connection.remoteAddress
        });
    });
});

sub.on('message', function(channel, message) {
    console.log(channel, message);

    try {
        message = JSON.parse(message);
    } catch(e) {
        return;
    }

    var client = findClientByIp(message.ip);

    if (client === undefined) {
        axios.post(getServiceUrl() + '/not-connected', {
            ip: message.ip
        });

        return;
    }

    client.emit(message.event, message);
});

sub.subscribe('Access');

io.listen(config.io.port);