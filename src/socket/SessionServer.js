const mongooseQuery = require('../db');

class SessionServer {

    constructor(socket) {
        this.socket = socket
        this.initSocket()
    }

    initSocket = () => {
        this.socket.on('connect', async (socket) => {
            /* Access equivalent of PassportJS's "req.user" here as "socket.request.user" */

            socket.onAny((event, ...args) => {
                this.parseAction(event, socket, ...args)
            })
        })
    }

    parseAction = (action, clientSocket, ...args) => {
        switch (action) {
            case "join":
                this.joinSession(clientSocket, args[0])
                break
            case "leave":
                this.leaveSession(clientSocket, args[0])
                break
            case "chat":
                this.emitChat(clientSocket, args[0])
                break
            case "player":
                this.emitPlayer(clientSocket, args[0])
                break
            case "queue":
                this.emitQueue(clientSocket, args[0])
                break
            case "session":
                this.emitSession(clientSocket, args[0])
                break
            case 'like':
                break;
            default:
                console.log("Invalid action")
        }
    }

    createActionObj = (action, username, userId, data) => {
        return {
            action: action,
            timestamp: Date.now(),
            username: username,
            userId: userId,
            data: data
        }
    }

    updateSessionState = async (sessionId, actionObj) => {
        await mongooseQuery.updateSession(sessionId, {
                $push: {
                    actionLog: actionObj
                }
        }).catch(error => {
            return error
        })
    }

    /*
        clientSocket is the socket associated with the emitting client, which has an id that is different from the user id.
        sessionId is the id of the Socket IO room of the Session, same as the session id.
    */
    joinSession = (clientSocket, sessionId) => {
        if (!clientSocket.rooms[1]) { //If not already in a Session
            clientSocket.join(sessionId);
            clientSocket.rooms[1].emit("get-session-state");
        }
        else {
            clientSocket.emit("session-error", "Client is already in a Session")
        }
    }

    leaveSession = (clientSocket, sessionId) => {
        if (clientSocket.rooms[1] && clientSocket.rooms[1] === sessionId) { //If in a Session
            clientSocket.leave(sessionId)
        }
        else {
            clientSocket.emit("session-error", "Client is not in a Session or client is not associated with the sessionId")
        }
    }

    likeSession = async (clientSocket, sessionId, likes) => {
        if (clientSocket.rooms[1] && clientSocket.rooms[1] === sessionId){
            this.socket.to(clientSocket.rooms[1]).emit("likes", likes);
            await mongooseQuery.updateSession(sessionId, {likes: likes});
        }
        else {
            clientSocket.emit("session-error", "Client is not in a Session or client is not associated with the sessionId")
        }
    }

    emitChat = async (clientSocket, chatObj) => {
        if (clientSocket.request.user) {
            var newChatObj = this.createActionObj("chat", chatObj.username, chatObj.userId, chatObj.data)
            this.socket.to(clientSocket.rooms[1]).emit("chat", newChatObj)
            await this.updateSessionState(clientSocket.rooms[1], newChatObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated")
        }
    }

    emitPlayer = async (clientSocket, playerObj) => {
        if (clientSocket.request.user) {
            var newPlayerObj = this.createActionObj("player", playerObj.username, playerObj.userId, playerObj.data)
            this.socket.to(clientSocket.rooms[1]).emit("player", newPlayerObj)
            await this.updateSessionState(clientSocket.rooms[1], newPlayerObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated or client is not the Session host")
        }
    }

    emitQueue = async (clientSocket, queueObj) => {
        if (clientSocket.request.user) {
            var newQueueObj = this.createActionObj("queue", queueObj.username, queueObj.userId, queueObj.data)
            this.socket.to(clientSocket.rooms[1]).emit("queue", newQueueObj)
            await this.updateSessionState(clientSocket.rooms[1], newQueueObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated or client is not the Session host")
        }
    }

    emitSession = async (clientSocket, sessionObj) => {
        if (clientSocket.request.user) {
            var newSessionObj = this.createActionObj("session", sessionObj.username, sessionObj.userId, sessionObj.data)
            this.socket.to(clientSocket.rooms[1]).emit("session", newSessionObj)
            await this.updateSessionState(clientSocket.rooms[1], newSessionObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated or client is not the Session host")
        }
    }
}

module.exports = SessionServer