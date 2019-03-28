import * as RedisSMQ from "rsmq";
import { SocketMessageData, ControlMessageData } from "./src/redisreader";
import { RedisReader } from "./src/redisreader";
import { RedisWriter } from "./src/rediswriter";

let b = new RedisWriter();
let a = new RedisReader();