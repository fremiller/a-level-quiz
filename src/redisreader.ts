import * as RedisSMQ from "rsmq";

/**
 * Represents a socket.io event
 * Has all the required data for my solution
 */
export interface SocketMessageData{
    /** Socket.io Event name */
    event: string,
    /** Socket.io socket ID */
    socketid: string,
    /** Socket.io event data */
    data: any
}

/**
 *  Represents a control event
 */
export interface ControlMessageData{
    method: "JOIN"|"CREATE",
}

/**
 * Interacts with the Redis Queue
 * Entrypoint for the worker application
 * This tells the worker what to do
 */
export class RedisReader{
    /** RSMQ client */
    rsmq: RedisSMQ
    /** The ID of this adapter, defaults to the dyno ID */
    adapterId: string
    /** Socket.IO events */
    sockets: Map<string, Map<string, (data: any)=>void>>

    /**
     * Creates a RedisAdapter
     * @param url The redis server's URL
     * @param adapterid The ID of this redis adapter
     */
    constructor(url=process.env.REDISCLOUD_URL, adapterid="epicqueue"){
        this.rsmq = new RedisSMQ({host: url});
        this.adapterId = adapterid;
        console.log(this.adapterId)
        this.sockets = new Map<string, Map<string, (data: any)=>void>>();
        this.rsmq.createQueue({qname:this.adapterId}, ()=>{
            
        })
        let instance = this;
        setInterval(()=>{
            this.rsmq.popMessage({qname: 'control'}, this.onRSMQControlMessage)
            this.rsmq.popMessage({qname:this.adapterId}, this.onRSMQSocketMessage);
            instance.rsmq.listQueues((err, queues:string[])=>{
                console.log(queues)
            })
        }, 100)
    }

    /**
     * Runs when an event is added to the adapter's queue
     * @param err RSMQ Error
     * @param message The message in the queue
     */
    onRSMQSocketMessage(err: {}, message: RedisSMQ.QueueMessage){
        if(!message ||!message.id){
            return;
        }
        let messageData: SocketMessageData = JSON.parse(message.message);
        this.sockets.get(messageData.socketid).get(messageData.event)(messageData.data);
        //this.rsmq.deleteMessageAsync({qname:"control",id:message.id})
    }

    /**
     * Runs whenever a control message is sent.
     * @param err RSMQ error
     * @param message The message content
     */
    onRSMQControlMessage(err: {}, message: RedisSMQ.QueueMessage){
        if (!message.id){
            return;
        }

        let messageData: ControlMessageData = JSON.parse(message.message);
        
        switch(messageData.method){
            case "CREATE":
                console.log("create")
                break;
            case "JOIN":
                console.log("join")
                break;
        }
    }

    /**
     * Adds a socket to 'listen'
     * @param socketid The ID of the socket.io socket
     * @param gameid The ID of the game
     */
    addSubscribedSocket(socketid: string, gameid: string){
        this.sockets.set(socketid, new Map<string, (data: any)=>void>());
    }

    /**
     * Adds a mock socket.io event
     * @param socketid The socket ID
     * @param event_name The socket.io event name
     * @param callbackFunction The event behaviour
     */
    addSocketEvent(socketid: string, event_name: string, callbackFunction: (...args: any[])=>void){
        let socket = this.sockets.get(socketid);
        socket.set(event_name, callbackFunction);
        this.sockets.set(socketid, socket);
    }

    on(socketid: string, event_name: string, callbackFunction: (...args: any[])=>void){
        this.addSocketEvent(socketid, event_name, callbackFunction)
    }
}

