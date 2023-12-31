import React from 'react';
import QueueEntry from './QueueEntry.js'
class QueueComponent extends React.Component {
	
    render(){
        var QueueEntries = this.props.Queue;
        var QueueList;
        let renderStuff;
        if(QueueEntries!= null){
            QueueList = QueueEntries.map((item, index) => item !== null ?


            <QueueEntry 
                artist={item.creator}
                title={item.name} 
                index={index}
                id={item._id}
                user={this.props.user}
                queueType={this.props.queueType}
                isHost={this.props.isHost}
                queue={this.props.Queue}
                queueObject={this.props.queueObject}
                handleEmitQueueState={this.props.handleEmitQueueState}
            />
            :
            item
            ); 
        }
        
               
        if(this.props.isHost){
            renderStuff = <div className='list-group list-group-sessionScreen'  style={{width: '100%', minWidth: '150px'}} {...this.props.provided.droppableProps} ref={this.props.provided.innerRef}>
                {QueueList}
                {this.props.provided.placeholder}
            </div>
        }
        else{
            renderStuff = 
            <div className='list-group list-group-sessionScreen' style={{width: '100%', minWidth: '150px'}}>
                {QueueList}
                            
            </div>
        }
        
    	return(
            renderStuff
                		
           
        );
        
    }
}

export default QueueComponent;