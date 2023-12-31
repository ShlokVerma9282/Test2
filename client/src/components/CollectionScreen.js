import React from 'react'
import Spinner from './Spinner'
import { icon_music_1, menu_button_white } from '../graphics'
import { ReactComponent as FavoriteButton } from '../graphics/music_player_pack/035-like.svg'
import { ReactComponent as DeleteButton } from '../graphics/user_pack/delete-button-white.svg'
import { Image, Button, Dropdown, ButtonGroup, Modal } from 'react-bootstrap';
import { Droppable, DragDropContext, Draggable } from 'react-beautiful-dnd'
import { mainScreens } from '../const'
import moment from 'moment';

const _ = require('lodash');


class CollectionScreen extends React.Component{
    constructor(props){
        super(props)
        this.state = {
            collectionId: null,
            user: this.props.user,
            collection: null,
            songList: [],
            loading: true,
            showEditNameModal: false,
            showEditDescriptionModal: false,
            collectionName: '',
            collectionDescription: '',
            playing: false,
            favorited: false,
            songPlaying: null,
            showUploadImageModal: false,
            uploadedImage: null,
            collectionImageSrc: null,
            error: false
        }
        this.onUploadImage = this.onUploadImage.bind(this);
    }

    componentDidUpdate = (prevProps, prevState) => {
        if (!_.isEqual(prevState.user, this.props.user)) {
            this.setState({
                user: this.props.user
            })
        }
        //If screen is now active
        if (!prevProps.visible && this.props.visible) {
            
            if(this.props.screenProps.collectionId){
               this.setState({
                    collectionId: this.props.screenProps.collectionId,
                    loading: true
                }, this.fetchCollection) 
            }
            
            
        }
    }

    onPressLikeCollection = () =>{
        if (this.props.user !== null){
            let favoritedCollections = this.props.user.likedCollections;
            let numLikes = this.state.collection.likes;
            if (!this.state.favorited){
                numLikes++;
                this.props.user.likedCollections === undefined ? 
                            favoritedCollections = [this.state.collection._id] :
                            favoritedCollections.push(this.state.collection._id);
            }
            else if (this.props.user.likedCollections !== undefined){
                if (numLikes > 0){numLikes--;}
                favoritedCollections = [];
                for (let c of this.props.user.likedCollections){
                    if (c !== this.state.collectionId){
                        favoritedCollections.push(c);
                    }
                }
            }

            //update collection
            this.props.axiosWrapper.axiosPost('/api/collection/updateCollection/'+ this.state.collectionId,
            {likes: numLikes}, (function(res, data){
                if (data.success){
                    //update user
                    this.props.axiosWrapper.axiosPost('/api/collection/updateUser/' + this.props.user._id,
                    {likedCollections: favoritedCollections}, (function(res, data){
                        if (data.success){
                            this.props.handleUpdateUser(data.data.user);
                            this.fetchCollection();
                        }
                    }).bind(this), true);
                }
            }).bind(this), true);

        }
    }

    onEditName = () => {
        if (this.state.collectionName.trim() !== ''){
            this.props.axiosWrapper.axiosPost('/api/collection/updateCollection/' + this.state.collectionId, 
            {name: this.state.collectionName}, (function(res, data){
                if (data.success){
                    this.hideEditNameModal();
                    this.fetchCollection();
                }
            }).bind(this), true);
        }
    }

    onEditDescription = () => {
        if (this.state.collectionName.trim() !== ''){
            this.props.axiosWrapper.axiosPost('/api/collection/updateCollection/' + this.state.collectionId, 
            {description: this.state.collectionDescription}, (function(res, data){
                if (data.success){
                    this.hideEditDescriptionModal();
                    this.fetchCollection();
                }
            }).bind(this), true);
        }
    }

    onPressDeleteSong = (song) => {
        let newSongList = [];
        for (let s of this.state.collection.songList){
            if (s !== song._id){
                newSongList.push(s);
            }
        }
        this.props.axiosWrapper.axiosPost('/api/collection/updateCollection/' + this.state.collectionId, 
        {songList: newSongList}, (function(res, data){
            if (data.success){
                this.fetchCollection();
            }
            else{
                console.log("Error: could not delete")            
            }
        }).bind(this), true)
    }

    onPressLikeSong = (song) => {
        let favedSongs = this.props.user.likedSongs;
        if (song.favorited){
            song.favorited = false;
            favedSongs = [];
            for(let s of this.props.user.likedSongs){
                if (s !== song._id){
                    favedSongs.push(s);
                }
            }
        }
        else{
            song.favorited = true;
            if(favedSongs === undefined){
                favedSongs = [song._id];
            }
            else{
                favedSongs.push(song._id);
            }
        }
        
        this.props.axiosWrapper.axiosPost('/api/collection/updateUser/' + this.props.user._id, 
        {likedSongs: favedSongs}, (function(res, data){
            if(data.success){
                this.props.handleUpdateUser(data.data.user);
                this.fetchCollection();
            }
        }).bind(this), true)
    }

    fetchCollection = () => {
        if (this.state.collectionId) {
            this.props.axiosWrapper.axiosGet('/api/collection/' + this.state.collectionId, (function(res, data) {
                if (data.success) {

                    let songs = data.data.collection.songList;
                    if (songs){
                        Promise.all(songs.map((songId) => {
                            return this.props.dataAPI.fetchVideoById(songId, true)
                        })).then((s) => {
                            if (this.props.user && this.props.user.likedSongs.length > 0) {
                                for (let song of s) {
                                    let songFaved = false
                                    for (let fav of this.props.user.likedSongs) {
                                        if (fav === song._id) {
                                            songFaved = true
                                        }
                                    }
                                    song.favorited = songFaved
                                }
                            }
                            else {
                                for (let song of s){
                                    song.favorited = false;
                                }
                            }
                            this.setState({ 
                                collection: data.data.collection,
                                loading: false,
                                error: false,
                                collectionName: data.data.collection.name,
                                favorited: this.isCollectionFavorited(data.data.collection),
                                songList: s,
                                collectionImageSrc: data.data.collection.image && data.data.collection.image.data ? this.setImage(data.data.collection.image) : null
                            })
                        })
                    }
                }

            }).bind(this), true, (function(res, data){
                console.log("erorr callback")
                    this.setState({
                        error:true,
                        loading:false
                    })
            
            }).bind(this))
        }
    }

    getSongDuration(duration){
        return moment.duration(duration).minutes() + ":" + String(moment.duration(duration).seconds()).padStart(2, '0');
        
    }

    getDateAdded(date){
        return '10/30/2020'
    }

    showEditNameModal = () => {
        this.setState({ showEditNameModal: true });
    }

    showEditDescriptionModal = () => {
        this.setState({ showEditDescriptionModal: true });
    }

    hideEditNameModal = () =>{
        this.setState({
            showEditNameModal: false,
            collectionName: this.state.collection.name
        });

    }

    hideEditDescriptionModal = () => {
        this.setState({
            showEditDescriptionModal: false,
            collectionDescription: this.state.collection.description
        });
    }    

    handleCollectionNameChange = (e) => {
        this.setState({ collectionName: e.target.value });
    }

    handleCollectionDescriptionChange = (e) => {
        this.setState({ collectionDescription: e.target.value });
    }

    isCollectionFavorited = (collection) => {
        if (this.props.user !== null && this.props.user.likedCollections !== undefined){
            for (let c of this.props.user.likedCollections){
                if (c === collection._id){
                    return true;
                }
            }
        } 
        return false;
    }


    onDeleteCollection = () => {
        this.props.axiosWrapper.axiosGet('/api/collection/delete/' + this.state.collectionId, (function(res, data){
            if (data.success){
                this.props.handleUpdateUser(data.data.user);
                this.props.switchScreen(mainScreens.PROFILE, data.data.user._id)
            }
        }).bind(this), true)
    }

    onPlayCollection = (song, index) => {
        if (this.props.shouldEmitActions()) {
            var data = {
                subaction: "play_song",
                songId: song._id
            }
            this.props.sessionClient.emitQueue(this.state.username, this.state.user._id, data)
        }

        this.props.playVideo(song._id, () => {
            for (let i = index + 1; i < this.state.songList.length; i++) {
                this.handleAddSongToFutureQueue(this.state.songList[i])
            }
    
            if (this.props.shouldStartSession()){
                this.createSession()
            }
        })
    }

    createSession = () => {
        this.props.axiosWrapper.axiosPost('/api/session/newSession', 
        {name: `${this.props.user.username}'s Live Session`}, 
        (function(res, data){
            if (data.success){
                this.props.handleUpdateUser(data.data.user)
                this.props.switchScreen(mainScreens.SESSION, data.data.sessionId)
            }
        }).bind(this), true)
    }

    //reorder songlist (persistant)
    handleOnDragEnd = (result) =>{
        if (result.destination !== null && result.source !== null){
            //update frontend
            /*
            let newStateSongList = _.cloneDeep(this.state.songList);
            let movedSong = newStateSongList[result.source];
            newStateSongList.splice(result.source.index, 1);
            newStateSongList.splice(result.destination.index, 0, movedSong);
            this.setState({songList: newStateSongList});
            */

            //update backend
            let newSongList = this.state.collection.songList;
            newSongList.splice(result.source.index, 1);
            newSongList.splice(result.destination.index, 0, result.draggableId);
            this.props.axiosWrapper.axiosPost('/api/collection/updateCollection/' + this.state.collectionId, 
            {songList: newSongList}, (function(res, data){
                if(data.success){
                    this.fetchCollection();
                }
            }).bind(this), true)
        }
    }

    handleAddSongToFutureQueue = (song) => {
        if (this.props.shouldEmitActions()) {
            var data = {
                subaction: "add_song",
                song: song
            }
            this.props.sessionClient.emitQueue(this.state.username, this.state.user._id, data)
        }
        this.props.queue.addSongToFutureQueue(song)
    }

    ownsCollection = () => {
        if (this.props.user){
            for (let playlist of this.props.user.playlists){
                if (String(playlist) === this.state.collection._id){
                    return true;
                }
            }
        }
        return false;
    }

    onUploadImage = (file) => {
        this.setState({uploadedImage: file});
        
    }

    onSubmitUploadImage = () => {
        if (this.state.uploadedImage !== null){
            this.hideUploadImageModal();
            new Promise((resolve, reject) => {
                var reader = new FileReader()

                reader.onload = function() {
                    resolve(reader.result)
                }
                
                reader.readAsBinaryString(this.state.uploadedImage[0])
            }).then(binary => {
                this.props.axiosWrapper.axiosPost('/api/collection/uploadImage/' + this.state.collectionId, {
                    image: binary, contentType: this.state.uploadedImage[0].type
                }, (function(res, data){
                        if (data.success){
                            this.setState({collectionImageSrc: URL.createObjectURL(this.state.uploadedImage[0])})
                        }
                }).bind(this), true)
            })
        }
    }

    showUploadImageModal = () => {
        this.setState({showUploadImageModal: true});
    }

    hideUploadImageModal = () => {
        this.setState({showUploadImageModal: false});
    }

    setImage = (image) => {
        return 'data:' + image.contentType + ';base64,' + btoa(image.data);
    }
    

    getCollectionFavoriteButtonClass = () => {
        return this.state.favorited ? "collection-favorite-button-icon-on" : "collection-favorite-button-icon"
    }


    render(){
        var component
        if (this.state.loading) {
            component = <Spinner/>
        }
        else if(this.state.error && !this.state.loading){
            component = <div className="color-accented body-text error-404-display">Oops, collection not found</div>
        }
        else {
            component = (
                <div className='container' style={{minWidth: '100%'}}>
                    <Modal show={this.state.showEditNameModal}>
						<Modal.Header onHide={this.hideEditNameModal} closeButton>
							<Modal.Title>Change Collection Name</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<p>Collection Name:</p>
							<input value={this.state.collectionName} onChange={this.handleCollectionNameChange}></input>
						</Modal.Body>
						<Modal.Footer>
							<Button variant="secondary" onClick={this.hideEditNameModal}>Close</Button>
							<Button variant="primary" onClick={this.onEditName}>OK</Button>
						</Modal.Footer>
					</Modal>
                    
                    <Modal show={this.state.showEditDescriptionModal}>
						<Modal.Header onHide={this.hideEditDescriptionModal} closeButton>
							<Modal.Title>Change Collection Description</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<p>Collection Description:</p>
							<input value={this.state.collectionDescription} onChange={this.handleCollectionDescriptionChange}></input>
						</Modal.Body>
						<Modal.Footer>
							<Button variant="secondary" onClick={this.hideEditDescriptionModal}>Close</Button>
							<Button variant="primary" onClick={this.onEditDescription}>OK</Button>
						</Modal.Footer>
					</Modal>


                    <Modal show={this.state.showUploadImageModal}>
						<Modal.Header onHide={this.hideUploadImageModal} closeButton>
							<Modal.Title>Add Image to Collection</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<p>Upload Image (PNG, JPG):</p>
							<input type='file' accept='image/jpg, image/png' onChange={e => this.onUploadImage(e.target.files)} style={{overflow: 'hidden'}}></input>
						</Modal.Body>
						<Modal.Footer>
							<Button variant="secondary" onClick={this.hideUploadImageModal}>Close</Button>
							<Button variant="primary" onClick={this.onSubmitUploadImage}>OK</Button>
						</Modal.Footer>
					</Modal>


                    {/* Header */}
                    <div className='row' style={{backgroundColor: 'grey', border: '2px solid black', }}>
                        <div className='col' style={{maxWidth: '30vw', maxHeight: '15vw', paddingTop: '10px', paddingBottom: '10px'}}>
                            <img src={this.state.collectionImageSrc == null ? icon_music_1 : this.state.collectionImageSrc} style={{maxWidth: '100%', maxHeight: '100%'}} alt=""></img>
                        </div>

                        {/* Collection Info */}
                        <div className='col' style={{marginRight: '30%', minWidth: '35%'}}>
                            <div className='row'>
                                <h2 className='collection-page-text' style={{marginTop: '5%'}}>
                                    {this.state.collection.name}
                                </h2>
                            </div>
                            <div className='row'>
                                <p className='collection-page-text'>
                                    {this.state.collection.description}
                                </p>
                            </div>
                            <div className='row'>
                                {/* Remember to add these attributes to collection objects*/}
                                <p className='collection-page-text' style={{marginBottom: '0'}}>
                                    {this.state.collection.ownerName} - {this.state.collection.likes} likes - {this.state.collection.songList.length} songs 
                                </p>
                            </div>
                        </div>

                        {/* Queue Buttons */}
                        <div className='col' style={{display: 'flex',  justifyContent: 'center'}}>
                            {this.ownsCollection() ?
                            <div className='row'>
                                <Dropdown className="search-screen-results-category-list-item-img-overlay-dropdown" as={ButtonGroup}>
                                    <Dropdown.Toggle split className="search-screen-results-category-list-item-img-overlay-dropdown-button no-caret">
                                        <Image className="search-screen-results-category-list-item-img-overlay-dropdown-button-icon" src={menu_button_white} />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="search-screen-results-category-list-item-img-overlay-dropdown-menu">
                                        <Dropdown.Item>
                                            <Button onClick={this.showEditNameModal}>
                                                Edit Name
                                            </Button>
                                        </Dropdown.Item>
                                        <Dropdown.Item>
                                            <Button onClick={this.showEditDescriptionModal}>
                                                Edit Description
                                            </Button>
                                        </Dropdown.Item>
                                        <Dropdown.Item>
                                            <Button onClick={this.showUploadImageModal}>
                                                Upload Collection Image
                                            </Button>
                                        </Dropdown.Item>
                                        <Dropdown.Item>
                                            <Button onClick={this.onDeleteCollection}>
                                                Delete Collection
                                            </Button>
                                        </Dropdown.Item>
                                        {this.state.songList.length > 0 ?
                                        (<Dropdown.Item>
                                            <Button onClick={() => this.onPlayCollection(this.state.songList[0], 0)}>
                                                Start Session from Collection
                                            </Button>
                                        </Dropdown.Item>) : <div></div>
                                        }
                                    </Dropdown.Menu>
                                </Dropdown> 
                            </div>
                            : <div></div>
                        }
                        {this.props.user ? 
                            <div className='row'>
                                <Button className='collection-favorite-button' style={{position: 'relative',  paddingTop: '5%'}}>
                                    <FavoriteButton className={this.getCollectionFavoriteButtonClass()} onClick={this.onPressLikeCollection}/>
                                </Button>
                            </div>
                            : <div></div>
                        }  
                        </div> 
                    </div>

                    {/* Queue List */}
                    
                    <div className='row' style={{paddingTop: '5px', border: '2px solid black', backgroundColor: 'grey'}}>
                        <h5 className='collection-page-text' style={{marginLeft: '1%', minWidth: '40%'}}>Title</h5>
                        <h5 className='collection-page-text' style={{minWidth: '30%'}}>Creator</h5>
                        <h5 className='collection-page-text' style={{minWidth: '20%'}}>Duration</h5>
                    </div>

                    {/* Songs */}
                    <div className='row'>
                        <DragDropContext onDragEnd={this.handleOnDragEnd} style={{minWidth: '100%'}}> 
                            <Droppable droppableId={this.state.collection.name}>        
                                {(provided) =>                 
                                (<ul style={{listStyleType: 'none', padding: '0', border: '2px solid black', minWidth: '100%'}} {...provided.droppableProps} ref={provided.innerRef}>
                                {this.state.songList.length > 0 ? 
                                (this.state.songList.map((e, i) => 
                                    (<Draggable key={e._id} draggableId={e._id} index={i} style={{minWidth: '100%'}}>
                                        {(provided) => 
                                        (<li className="collection-page-rows" style={{minWidth: '90vw'}} {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef}>
                                            <div style={{display: 'flex', alignItems: 'center', height: '40px'}}>
                                                <div className='collection-song-title ellipsis-multi-line-overflow'  style={{display: 'inline-block', marginLeft: '1%', minWidth: '35%', marginRight: '5%'}} onClick={() => this.onPlayCollection(e, i)}>{e.name}</div>
                                                <div className='collection-song-title ellipsis-multi-line-overflow' style={{display: 'inline-block', minWidth: '25%', marginRight: '5%'}}>{e.creator}</div>
                                                <div className='collection-page-text' style={{display: 'inline-block', minWidth: '15%', marginRight: '5%'}}>{this.getSongDuration(e.duration)} </div>
                                                { this.props.user ? 
                                                    <Button className='collection-song-favorite-button' style={{position: 'relative', display: 'inline-block', height: '40px', width: '40px'}}>
                                                        {/* Fix during implementation */}
                                                        <FavoriteButton onClick={() => this.onPressLikeSong(e)} className={e.favorited ? "collection-song-favorite-button-icon-on" : "collection-song-favorite-button-icon"}/>
                                                    </Button>
                                                    : <div></div>
                                                }
                                                { this.ownsCollection() ? 
                                                <Button className='collection-song-favorite-button' style={{position: 'relative', display: 'inline-block', height: '40px', width: '40px'}} 
                                                        onClick={() => this.onPressDeleteSong(e)}>
                                                    <DeleteButton className="collection-song-favorite-button-icon"/>
                                                </Button>
                                                : <div></div>
                                                }
                                            </div>
                                        </li>)}
                                    </Draggable>)
                                    )
                                ) : <div></div>}
                                {provided.placeholder}
                                </ul>)}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            )
        }
        return (
            <div className={this.props.visible ? "visible" : "hidden"}>
                {component}
            </div>
        )
    }
}

export default CollectionScreen;