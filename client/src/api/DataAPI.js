import { youtube_data_api_src, youtube_data_api_discovery_doc, youtube_data_api_key, google_oauth2_client_id } from '../const'

const loadScript = require('load-script2')

class DataAPI {
    constructor(onLoad, ...args) {
        this._dataAPIReady = false
        loadScript(youtube_data_api_src).then(() => {
            window.gapi.load('client', () => {
                window.gapi.client.init({
                    apiKey: youtube_data_api_key,
                    clientId: google_oauth2_client_id,
                    discoveryDocs: [youtube_data_api_discovery_doc],
                }).then(() => {
                    this._dataAPIReady = true
                    if (onLoad) {
                        onLoad(...args)
                    }
                })
            })
        })
    }

    unescapeHTML = (html) => {
        var doc = document.createElement("textarea");
        doc.innerHTML = html;
        return doc.value;
    }

    fetchMostPopular = (max=15, snippet=false) => {
        if (this._dataAPIReady) {
            var res = window.gapi.client.youtube.videos.list({
                part: snippet ? ["snippet", "statistics", "contentDetails"] : ["contentDetails"],
                maxResults: max,
                chart: "mostPopular",
                videoCategoryId: "10",
                regionCode: "US"
            }).then((response) => {
                return response.result.items.map(obj => ({
                    _id: obj.id,
                    type: "song",
                    name: this.unescapeHTML(obj.snippet.title),
                    creatorId: obj.snippet.channelId,
                    creator: this.unescapeHTML(obj.snippet.channelTitle),
                    likes: parseInt(obj.statistics.likeCount),
                    image: obj.snippet.thumbnails.default ? obj.snippet.thumbnails.default.url : null,
                    image_high: obj.snippet.thumbnails.high ? obj.snippet.thumbnails.high.url : null,
                    image_maxres: obj.snippet.thumbnails.maxres ? obj.snippet.thumbnails.maxres.url : null,
                    image_med: obj.snippet.thumbnails.medium ? obj.snippet.thumbnails.medium.url : null,
                    image_std: obj.snippet.thumbnails.standard ? obj.snippet.thumbnails.standard.url: null,
                    duration: obj.contentDetails.duration
                }))
            }, (err) => {
                return err
            }, this)

            return res
        }
    }

    fetchVideoById = (id, snippet=false) => {
        if (this._dataAPIReady) {
            var res = window.gapi.client.youtube.videos.list({
                part: snippet ? ["snippet", "statistics", "contentDetails"] : ["contentDetails"],
                _id: id
            }).then((response) => {
                var obj = response.result.items[0]
                if (snippet) {
                    return {
                        _id: obj.id,
                        type: "song",
                        name: this.unescapeHTML(obj.snippet.title),
                        creatorId: obj.snippet.channelId,
                        creator: this.unescapeHTML(obj.snippet.channelTitle),
                        likes: parseInt(obj.statistics.likeCount),
                        image: obj.snippet.thumbnails.default ? obj.snippet.thumbnails.default.url : null,
                        image_high: obj.snippet.thumbnails.high ? obj.snippet.thumbnails.high.url : null,
                        image_maxres: obj.snippet.thumbnails.maxres ? obj.snippet.thumbnails.maxres.url : null,
                        image_med: obj.snippet.thumbnails.medium ? obj.snippet.thumbnails.medium.url : null,
                        image_std: obj.snippet.thumbnails.standard ? obj.snippet.thumbnails.standard.url: null,
                        duration: obj.contentDetails.duration
                    }
                } 
                else {
                    return {
                        _id: obj.id,
                        duration: obj.contentDetails.duration
                    }
                }
            }, (err) => {
                return err
            }, this)

            return res
        }
    }

    queryVideos = (query, pageToken) => {
        if (this._dataAPIReady) {
            var res = window.gapi.client.youtube.search.list({
                part: [
                    "snippet"
                ],
                maxResults: 10,
                order: "viewCount",
                q: query,
                pageToken: pageToken ? pageToken : "",
                type: "video",
                videoCategoryId: "10",
                videoSyndicated: true,
                videoEmbeddable: true
            }).then((response) => {
                return {
                    nextPageToken: response.result.nextPageToken ? response.result.nextPageToken : null,
                    prevPageToken: response.result.prevPageToken ? response.result.prevPageToken : null,
                    res: response.result.items.map(res => this.constructVideoResultObj(res))
                }
            }, (err) => {
                return err
            }, this)

            return res
        }
    }

    constructVideoResultObj = (obj) => {
        return {
            _id: obj.id.videoId,
            type: "song",
            name: this.unescapeHTML(obj.snippet.title),
            creatorId: obj.snippet.channelId,
            creator: this.unescapeHTML(obj.snippet.channelTitle),
            image: obj.snippet.thumbnails.default.url,
            image_high: obj.snippet.thumbnails.high.url,
            image_med: obj.snippet.thumbnails.medium.url
        }
    }
}

export default DataAPI;