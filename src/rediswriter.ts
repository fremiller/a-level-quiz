import * as RedisSMQ from "rsmq";
import { SocketMessageData, ControlMessageData } from "./redisreader";

export class RedisWriter {
    /** RSMQ client */
    rsmq: RedisSMQ
    /** The ID of this adapter, defaults to the dyno ID */
    adapterId: string

    constructor(url: string=process.env.REDISCLOUD_URL){
        this.rsmq = new RedisSMQ({host: url});
        let instance = this;
        this.rsmq.deleteQueue({qname: "control"}, ()=>{
            this.rsmq.createQueue({qname: "control", delay: 0, maxsize: -1}, ()=>{
                let meme: ControlMessageData = {
                    method: "CREATE"
                }
                setInterval(()=>{
                    instance.rsmq.listQueues((err, queues:string[])=>{
                        console.log(queues)
                    })
                    instance.rsmq.sendMessage({qname:"control",delay:0,message:JSON.stringify(meme)}, (i)=>{})
                }, 5000)
            }) 
        })
    }


}