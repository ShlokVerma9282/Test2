import React, {useState} from 'react';
import { icon_profile_image, icon_radio } from '../graphics';
import ChatFeed from './Chat/ChatFeed.js';
import QueueComponent from './Queues/QueueComponent.js';
import Spinner from './Spinner';
import {Droppable, DragDropContext, Draggable} from 'react-beautiful-dnd'

class SessionScreen extends React.Component {
	constructor(props){
		super(props);
		this.getSession()
		this.state = {
			loading: true,
			error: false,
			id: null,
			hostId:null,
			name: null,
			startTime: null,
			endTime: null,
			initialQueue: null,
			currentSong: null,
			prevQueue: null,
			nextQueue: null,
			actionLog: null,
			messageText: "",
			hostName: null
		}
		this.props.sessionClient.joinSession(this.props.match.params.sessionId)
	}

	getSession = () => { 
		if (this.props.match.params.sessionId){
			this.props.axiosWrapper.axiosGet("/api/session/" + this.props.match.params.sessionId, this.handleGetSession, true)
		}
		else {
			// Render suggestions to start a session?
		}
	}
	handleTextChange = (e) => {
		if(this.state.messageText.length <= 250 && !(e.target.value.length > 250)){
			this.setState({
				messageText: e.target.value
			});
		}
		
	}
	onKeyPress = (e) => {

		if(e.key === "Enter" && this.state.messageText.length <= 250){
			
			
			//console.log(this.props.user);
			/*Adjust new object for new action types*/
			const obj = {'type':"message", 'object':{'username':this.props.user.username, 'message':this.state.messageText, 'timestamp':(this.state.actionLog[this.state.actionLog.length-1].object.timestamp)+1}};
			this.setState({
				actionLog: this.state.actionLog.concat(obj),
				messageText: ""

			})
		}

	}
	handleOnDragEnd = (e) =>{
		if(!e.destination) return;
		console.log(e);
		if(e.destination.droppableId === "nextQueue"){
			const items = Array.from(this.state.nextQueue);
			const [reorderedItem] = items.splice(e.source.index, 1);
			items.splice(e.destination.index, 0, reorderedItem);

			this.setState({
				nextQueue: items
			});
		}
		
	}
	handleGetSession = (status,data) =>{
		var session = null;
		if(status === 200){
			session = data.data.session;
			this.props.playVideo(session.initialQueue.shift());
			Promise.all(session.initialQueue.map((songId) => {
            	return this.props.fetchVideoById(songId, true) //Initial queue of song objects
        	})).then((v) => {

        		let nextQueue = v;
	            
	        	nextQueue.forEach(song => this.props.queue.addSongToFutureQueue(song));
	        	//this.props.queue.nextSong();
            	this.setState({
	        		loading:false,
	        		id: session._id,
					hostId:session.hostId,
					name : session.name,
					startTime : session.startTime ,
					endTime : session.endTime,
					initialQueue: v,
					nextQueue: nextQueue,
					currentSong: this.props.queue.getCurrentSong(),
					actionLog : session.actionLog,
					hostName : session.hostName
	        	})
	        })
            
        }
        else if(status === 404){
        	console.log(status);
        	console.log(data);
        	this.setState({
        		loading:false,
        		error: true
        	})
        }
	}

    render(){
    	
    	
    	let renderContainer = false
    	if(!this.state.loading && !this.state.error){
    		renderContainer = 
    			<div style={{fontFamily: 'BalsamiqSans', marginLeft:'15px', height:'100%'}}>
        		<div className='row' style={{height:'100%'}}>
        			<div className='col-sm-8' style={{height:'100%'}}>
	        			<div className='row' style={{height:'22%', border: '3px solid black', borderRadius: '25px'}}>
	        				<div className='col' style={{maxWidth:'35%', height:'100%', padding:'1em'}}>
	        					<img src={icon_profile_image} style={{backgroundColor:'white',display: 'block', margin: 'auto', height:'90%',
	        									 border: '3px solid black'}}/>
	        				</div>
	        				<div className='col' style={{maxWidth:'50%', minWidth:'50%', padding:'1em', color:'white'}}>
	        					<div className='title session-title-text'>
	        						{this.state.name}

	        					</div>
	        					<div className='body-text' style={{marginTop:'30px', margin: 'auto'}}>
	        						{this.state.hostName}
	        					</div>
	        				</div>
	        				<div className='col' style={{maxWidth:'25%', textAlign: 'right', padding:'1em', minWidth:'10%',color:'white',  float:'right'}}>
	        					<div className='body-text'>LIVE<img src={icon_radio} style={{width:'30px'}}/></div>
	        					{this.state.startTime}

	        				</div>
	        			</div>
	        			<div className='row bg-color-contrasted' style={{height:'calc(78% - 40px)',overflow:'scroll',overflowX:'hidden',border: '3px solid black'}}>
	        				<ChatFeed actionLog={this.state.actionLog} user={this.props.user}  />
	        			</div>
	        			<div className='row' style={{height:'40px',border: '3px solid black',backgroundColor:'white'}}>
	        				<input type='text' name='MessageSender' placeholder='Send your message here...' onChange={this.handleTextChange} onKeyPress={this.onKeyPress} value={this.state.messageText} style={{width:'95%', display:'block'}}/>
	        				<div style={{width:'5%', display:'block', textAlign:'center'}}>{this.state.messageText.length}/250</div>
	        			</div>
	        		</div>
	        		<div className='col-sm-4' style={{height:'100%'}}>
	        			
	        			
	        				
	        					 <DragDropContext onDragEnd={this.handleOnDragEnd}>
	        					 	<div className='row bg-color-contrasted title session-title-text' style={{color:'white', height:'7%', border: '3px solid black'}}>
				        				Up Next
				        			</div>
	        					 	<div className='row' style={{height:'43%'}}>
						                <Droppable droppableId="nextQueue">
						                    {(provided) => ( 
						                    	<QueueComponent Queue={this.state.nextQueue} fetchVideoById={this.props.fetchVideoById} provided={provided} />
						        			 )}
						        			   
						                </Droppable>
					                </div>
						            <div className='row bg-color-contrasted title session-title-text' style={{color:'white', height:'7%', border: '3px solid black'}}>
				        				Previously Played
				        			</div>
				        			<div className='row' style={{height:'43%'}}>
					        			<Droppable droppableId="prevQueue">
						                    {(provided) => ( 
		        								<QueueComponent Queue={this.state.prevQueue} fetchVideoById={this.props.fetchVideoById} provided={provided} />
		        							)}
		        							
						                </Droppable>
				        			</div>
					            </DragDropContext>
	        		</div>
        		</div>
        		
        	</div>

    	}
    	else if (this.state.loading && !this.state.error){
    		renderContainer = <Spinner/>
    	}
    	else{
    		renderContainer = <div style={{color:'white'}}>Error 404</div>
    	}
        return(
        	renderContainer
        	);
    }
}

export default SessionScreen;