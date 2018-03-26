// Setup basic express server
self.port      = process.env.OPENSHIFT_INTERNAL_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var numUsers = 0;

// socket.io initialization on the server side
self.initializeSocketIO = function() {
        self.server = require('http').createServer(self.app);
        self.io = require('socket.io').listen(self.server);
        self.io.enable('browser client minification');  // send minified client
        self.io.enable('browser client etag');          // apply etag caching logic based on version number
        self.io.enable('browser client gzip');          // gzip the file
        self.io.set('log level', 1);                    // reduce logging

        self.io.set('transports', [
                'websocket'
            ]);
        return this;
    }

    self.addSocketIOEvents = function() {
        self.io.sockets.on('connection', function (socket) {
          var addedUser = false;

          // when the client emits 'new message', this listens and executes
          socket.on('new message', function (data) {
            // we tell the client to execute 'new message'
            socket.broadcast.emit('new message', {
              username: socket.username,
              message: data
            });
          });

          // when the client emits 'add user', this listens and executes
          socket.on('add user', function (username) {
            if (addedUser) return;

            // we store the username in the socket session for this client
            socket.username = username;
            ++numUsers;
            addedUser = true;
            socket.emit('login', {
              numUsers: numUsers
            });
            // echo globally (all clients) that a person has connected
            socket.broadcast.emit('user joined', {
              username: socket.username,
              numUsers: numUsers
            });
          });

          // when the client emits 'typing', we broadcast it to others
          socket.on('typing', function () {
            socket.broadcast.emit('typing', {
              username: socket.username
            });
          });

          // when the client emits 'stop typing', we broadcast it to others
          socket.on('stop typing', function () {
            socket.broadcast.emit('stop typing', {
              username: socket.username
            });
          });

          // when the user disconnects.. perform this
          socket.on('disconnect', function () {
            if (addedUser) {
              --numUsers;

              // echo globally that this client has left
              socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
              });
            }
          });
      });
}

/**
 *  Initializes the sample application.
 */
self.initialize = function() {
    self.setupVariables();
    self.populateCache();
    self.setupTerminationHandlers();

    // Create the express server and routes.
    self.initializeServer();
    self.initializeSocketIO().addSocketIOEvents();
};
