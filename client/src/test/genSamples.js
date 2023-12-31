import * as icons from '../test'
import axios from 'axios'
axios.defaults.baseURL = 'http://localhost:4000'
const _ = require('lodash');

let sessions = require('./sampleSessions.json');
let collections = require('./sampleCollections.json')
let songs = require('./sampleSongs.json')
let users = require('./sampleUsers.json')

/*
    Sample data initialization
*/

function initType(category, categoryName) {
    for (var i = 0; i < category.length; i++) {
        category[i].type = categoryName
    }
    return category
}

function initCreator(category) {
    for (var i = 0; i < category.length; i++) {
        switch(category[i].type) {
            case "session":
                category[i].creator = category[i].hostName
                break;
            case "collection":
                category[i].creator = category[i].user
                break;
            case "song":
                category[i].creator = category[i].artist
                break;
            case "user":
            default:
                category[i].creator = ""
                break;
        }
    }
    return category
}

function initImage(category) {
    for (var i = 0; i < category.length; i++) {
        category[i].image = genSampleImage()
    }
    return category
}

function initData(category, categoryName) {
    var initFunctions = [initType, initCreator, initImage]
    for (var i = 0; i < initFunctions.length; i++) {
        category = initFunctions[i](_.cloneDeep(category), categoryName)
    }
    return category
}

let sampleDatabase = {
    sessions: initData(sessions.map(session => {
        session.initialQueue = initData(session.initialQueue, "song")
        return session
    }), "session"),
    collections: initData(collections.map(collection => {
        collection.songList = initData(collection.songList, "song")
        return collection
    }), "collection"),
    songs: initData(songs, "song"),
    users: initData(users.map(user => {
        user.playlists = initData(user.playlists.map(playlist => {
            playlist.songList = initData(playlist.songList, "song")
            return playlist
        }), "collection")
        user.likedSongs = initData(user.likedSongs, "song")
        user.likedCollections = initData(user.likedCollections.map(collection => {
            collection.songList = initData(collection.songList, "song")
            return collection
        }))
        user.sessions = initData(user.sessions.map(session => {
            session.initialQueue = initData(session.initialQueue, "song")
            return session
        }), "session")
        return user
    }), "user")
}



/*
        Sample data generating functions
*/

export function genSampleSuggestions () {
    return [
        {
            categoryName: "Your Top Hosts",
            suggestions: JSON.parse(JSON.stringify(sampleDatabase.users))
        }, 
        {
            categoryName: "Recently Streamed",
            suggestions: JSON.parse(JSON.stringify(sampleDatabase.sessions))
        },
        {
            categoryName: "Recommended For You",
            suggestions: JSON.parse(JSON.stringify(sampleDatabase.collections))
        },
        {
            categoryName: "Listen Again",
            suggestions: JSON.parse(JSON.stringify(sampleDatabase.songs))
        }
    ]
}

export function genSampleImage () {
    let keys = Object.keys(icons);
    return icons[keys[Math.floor(Math.random() * (keys.length - 1))]];
}

/* Will get stuck in an infinite loop if numItems > number of elements actually in the sample database */
export function genSampleHistory (numItems) {
    let sampleDatabaseCopy = JSON.parse(JSON.stringify(sampleDatabase))
    let categorykeys = Object.keys(sampleDatabaseCopy);
    let sampleHistory = []
    var i = 0
    while (sampleHistory.length < numItems){
        var categoryName = categorykeys[categorykeys.length * Math.random() << 0]
        if (sampleDatabaseCopy[categoryName].length > 0){
            var history = sampleDatabaseCopy[categoryName].pop()
            history.index = i
            sampleHistory.push(history)
            i++
        }
    }

    return sampleHistory
}

export function genSampleResults (query) {

    var sampleDatabaseCopy = JSON.parse(JSON.stringify(sampleDatabase))

    return {
            sessions: sampleDatabaseCopy.sessions.filter(item => item.name.toLowerCase().includes(query) || item.hostName.toLowerCase().includes(query)),
            collections: sampleDatabaseCopy.collections.filter(item => item.name.toLowerCase().includes(query) || item.user.toLowerCase().includes(query)),
            users: sampleDatabaseCopy.users.filter(item => item.name.toLowerCase().includes(query))
        }
}

export function genSampleQueue () {
    var songsCopy = _.cloneDeep(sampleDatabase.songs)
    
    /* Fisher-Yates shuffle from https://medium.com/@nitinpatel_20236/how-to-shuffle-correctly-shuffle-an-array-in-javascript-15ea3f84bfb */
    for (let i = songsCopy.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * i)
        const temp = songsCopy[i]
        songsCopy[i] = songsCopy[j]
        songsCopy[j] = temp
      }
    return songsCopy
}

export function genSampleSessions () {
    var sessionsCopy = _.cloneDeep(sampleDatabase.sessions)
    return sessionsCopy
}

export function genSampleUsers () {
    var usersCopy = _.cloneDeep(sampleDatabase.users).map(user => {
        user.history = genSampleHistory(10)
        return user
    })
    return usersCopy
}