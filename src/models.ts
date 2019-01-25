import { Model, Mongoose, Document, Schema } from "mongoose";
import * as mongoose from "mongoose";
import { ClassInfo } from "./classroom";

var SchemaNames = [
    "GameStats",
    "Question",
    "User",
    "UserGameStats"
]

var schemas: {
    User: any,
    UserGameStats: any,
    GameStats: any,
    Question: any
};

export interface IUser {
    name: string,
    googleid: string,
    previousGames: [string],
    domain: string,
    profileImage: string,
    userType: Number,
    classes: ClassInfo[]
}

export interface IUserGameStats {
    classId: string,
    timestamp: string,
    position: number,
    userId: string,
    questions: number[]
}

export interface IGameStats{
    classId: string,
    timestamp: string,
    players: string[],
    questions: string[]
}

export interface IQuestion{
    question: string,
    type: string,
    timeLimit: number,
    answers: string[],
    correctAnswer: number,
    exam: string,
}


export interface IUserGameStatsDocument extends IUserGameStats, Document{};
export interface IUserDocument extends IUser, Document{};
export interface IGameStatsDocument extends IGameStats, Document{};
export interface IQuestionDocument extends IQuestion, Document{};

export var User: Model<IUserDocument, {}>;
export var UserGameStats: Model<IUserGameStatsDocument, {}>;
export var GameStats: Model<IGameStatsDocument, {}>;
export var Question: Model<IQuestionDocument, {}>;
export var UserType: {};

/**
 * This function initialises all the models for the database object to use
 */
export function init() {
    let _schematemp = {};
    SchemaNames.forEach((name) => {
        _schematemp[name] = require("../models/" + name).Schema
    })
    // @ts-ignore
    schemas = _schematemp;
    console.log("[MODELS] Initialising User Model");
    User = mongoose.model("User", schemas.User);
    console.log("[MODELS] Initialising UserGameStats Model");
    UserGameStats = mongoose.model("UserGameStats", schemas.UserGameStats);
    console.log("[MODELS] Initialising GameStats Model");
    GameStats = mongoose.model("GameStats", schemas.GameStats);
    console.log("[MODELS] Initialising Question model")
    Question = mongoose.model("Questions", schemas.Question);
    UserType = require("../models/UserType").UserType
}