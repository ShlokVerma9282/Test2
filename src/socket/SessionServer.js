const mongooseQuery = require('../db')
const stripUser = require('../routes').stripUser

class SessionServer {

    constructor(mainSocket, socket) {
        this.mainSocket = mainSocket
        this.socket = socket
        this.initSocket()
    }

    initSocket = () => {
        this.socket.on('connect', (socket) => {
            /* Access equivalent of PassportJS's "req.user" here as "socket.request.user" */

            socket.onAny((event, ...args) => {
                this.parseAction(event, socket, ...args)
            })

            socket.on('disconnecting', () => {
                this.terminateSession(socket)
            })
        })
    }

    parseAction = (action, clientSocket, ...args) => {
        switch (action) {
            case "ready":
                this.readySession(clientSocket)
                break
            case "join":
                this.joinSession(clientSocket, args[0])
                break
            case "leave":
                this.leaveSession(clientSocket, args[0])
                break
            case "end":
                this.endSession(clientSocket, args[0])
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

    /*
        terminateSession handles the graceful termination of the application on the client-side.
        It handles, if you are a Session host, ending the Session; if you are a participant, leaving the Session.
    */
    async terminateSession (clientSocket) {
        if (![...clientSocket.rooms][1]) { //If not in a Session
            return
        }
        var user = clientSocket.request.user
        if (user) {
            //Temporary solution until socket.request.user gets passed updated User
            user = await mongooseQuery.getUser({_id: user._id}, true)
            user = stripUser(user)
            if (user.hosting) { //Host
                var actionObj = this.createActionObj("session", user.username, user._id, {
                    subaction: "end_session"
                })
                this.socket.to(String(user.currentSession)).emit("session", actionObj)

                await mongooseQuery.deleteSession({
                    _id: user.currentSession
                })
                await mongooseQuery.updateUser(user._id, {
                    currentSession: null,
                    hosting: false,
                    live: false
                })
            }
            else { //User participant
                var newChatObj = this.createActionObj("chat", user.username, user._id, {
                    subaction: "leave"
                })
                this.socket.to(String(user.currentSession)).emit("chat", newChatObj)
                await mongooseQuery.updateSession(user.currentSession, {
                    $inc: {
                        streams: -1
                    }
                })
                await mongooseQuery.updateUser(user._id, {
                    currentSession: null
                })
            }
        }
        else { //Guest participant
            this.leaveSession(clientSocket)
        }

        mongooseQuery.getLiveSessions().then(sessions => {
            this.mainSocket.emit('top-sessions', sessions)
        })
    }

    /*
        clientSocket is the socket associated with the emitting client, which has an id that is different from the user id.
        sessionId is the id of the Socket IO room of the Session, same as the session id.
    */
    readySession = (clientSocket) => {
        if (clientSocket.request.user) {
            mongooseQuery.updateSession([...clientSocket.rooms][1], {live: true}).then(async () => {
                var sessions = await mongooseQuery.getLiveSessions()
                this.mainSocket.emit('top-sessions', sessions)
            })
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated")
        }
    }

    joinSession = (clientSocket, sessionId) => {
        if (![...clientSocket.rooms][1]) { //If not already in a Session
            clientSocket.join(sessionId)

            if (clientSocket.request.user) {
                var user = stripUser(clientSocket.request.user)
                var newChatObj = this.createActionObj("chat", user.username, user._id, {
                    subaction: "join"
                })
                this.socket.to([...clientSocket.rooms][1]).emit("chat", newChatObj);
            }

            mongooseQuery.updateSession([...clientSocket.rooms][1], {
                $inc: {
                    streams: 1
                }
            }).then(async () => {
                var sessions = await mongooseQuery.getLiveSessions()
                this.mainSocket.emit('top-sessions', sessions)
            })
        }
        else {
            clientSocket.emit("session-error", "Client is already in a Session")
        }
    }

    leaveSession = (clientSocket) => {
        if ([...clientSocket.rooms][1]) { //If in a Session
            if (clientSocket.request.user) {
                var user = stripUser(clientSocket.request.user)
                var newChatObj = this.createActionObj("chat", user.username, user._id, {
                    subaction: "leave"
                })
                this.socket.to([...clientSocket.rooms][1]).emit("chat", newChatObj);
            }
            mongooseQuery.updateSession([...clientSocket.rooms][1], {
                $inc: {
                    streams: -1
                }
            }).then(async () => {
                clientSocket.leave([...clientSocket.rooms][1])
                var sessions = await mongooseQuery.getLiveSessions()
                this.mainSocket.emit('top-sessions', sessions)
            })
        }
        else {
            clientSocket.emit("session-error", "Client is not in a Session")
        }
    }

    endSession = (clientSocket) => {
        if ([...clientSocket.rooms][1]) { //If in a Session
            clientSocket.leave([...clientSocket.rooms][1])
            mongooseQuery.getLiveSessions().then(sessions => {
                this.mainSocket.emit('top-sessions', sessions)
            })
        }
        else {
            clientSocket.emit("session-error", "Client is not in a Session")
        }
    }

    likeSession = (clientSocket, sessionId, likes) => {
        if ([...clientSocket.rooms][1] && [...clientSocket.rooms][1] === sessionId){
            this.socket.to([...clientSocket.rooms][1]).emit("likes", likes);
            mongooseQuery.updateSession(sessionId, {likes: likes});
        }
        else {
            clientSocket.emit("session-error", "Client is not in a Session or client is not associated with the sessionId")
        }
    }

    emitChat = (clientSocket, chatObj) => {
        if (clientSocket.request.user) {
            var newChatObj = this.createActionObj("chat", chatObj.username, chatObj.userId, chatObj.data)
            this.socket.to([...clientSocket.rooms][1]).emit("chat", newChatObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated")
        }
    }

    emitPlayer = (clientSocket, playerObj) => {
        if (clientSocket.request.user) {
            var newPlayerObj = this.createActionObj("player", playerObj.username, playerObj.userId, playerObj.data)
            this.socket.to([...clientSocket.rooms][1]).emit("player", newPlayerObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated or client is not the Session host")
        }
    }

    emitQueue = (clientSocket, queueObj) => {
        if (clientSocket.request.user) {
            var newQueueObj = this.createActionObj("queue", queueObj.username, queueObj.userId, queueObj.data)
            this.socket.to([...clientSocket.rooms][1]).emit("queue", newQueueObj)
        }
        else {
            clientSocket.emit("session-error", "Client is not authenticated or client is not the Session host")
        }
    }

    emitSession = (clientSocket, sessionObj) => {
        var newSessionObj = this.createActionObj("session", sessionObj.username, sessionObj.userId, sessionObj.data)
        this.socket.to([...clientSocket.rooms][1]).emit("session", newSessionObj)
    }
}

module.exports = SessionServer