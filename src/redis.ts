import * as RedisSMQ from "rsmq";

/**
 * Represents a socket.io event
 * Has all the required data for my solution
 */
interface SocketMessageData{
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
interface ControlMessageData{
    method: "JOIN"|"CREATE",
}

/**
 * Interacts with the Redis Queue
 * Entrypoint for the worker application
 * This tells the worker what to do
 */
class RedisAdapter{
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
    constructor(url=process.env.REDISCLOUD_URL, adapterid=process.env.DYNO){
        this.rsmq = new RedisSMQ({host: url});
        this.adapterId = adapterid;
        this.sockets = new Map<string, Map<string, (data: any)=>void>>();
        this.rsmq.createQueue({qname:this.adapterId,maxsize:-1,delay:0}, ()=>{
            this.rsmq.receiveMessage({qname:this.adapterId}, this.onRSMQSocketMessage);
        })
        this.rsmq.receiveMessage({qname: 'control'}, this.onRSMQControlMessage)
    }

    /**
     * Runs when an event is added to the adapter's queue
     * @param err RSMQ Error
     * @param message The message in the queue
     */
    onRSMQSocketMessage(err: {}, message: RedisSMQ.QueueMessage){
        if(!message.id){
            return;
        }
        let messageData = JSON.parse(message.message);
        this.sockets.get(messageData.socketid).get(messageData.event)(messageData.data);
    }

    onRSMQControlMessage(err: {}, message: RedisSMQ.QueueMessage){

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

