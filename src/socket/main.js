const mongooseQuery = require('../db')

module.exports = function (io, ...middlewares) {
    
    const socket = io.of('/main')
    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next)
    
    middlewares.forEach(arg => socket.use(wrap(arg)))

    socket.on('connect', (socket) => {
        /* Access equivalent of PassportJS's "req.user" here as "socket.request.user" */
        console.log('Connected to Main namespace')

        socket.on('get-top-sessions', async () => {
            let sessions = await mongooseQuery.getLiveSessions().catch(err => {
                socket.emit('error')
            })
            socket.emit('top-sessions', sessions)
        })
    })

    socket.on('disconnect', (socket) => {
        console.log('Disconnected from Main namespace')
    })

    return socket
}