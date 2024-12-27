import http from 'node:http';
import app from "./app.js";
import config from './src/v1/config/config.js'

// get data from .env file
const port = config.port || "3000";
const host = config.host || "localhost";

// Create the server and Socket.IO instance
const server = http.createServer(app);

// start server
const listenServer = server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});