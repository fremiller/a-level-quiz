var game = require("../src/game");
var assert = require("assert");
var {
    SocketIO,
    Server
} = require("mock-socket");

const MOCK_PLAYER = {
    "name": "test",
    "googleid": "1",
    "type": 0,
    "domain": "test.school"
}

function getMockUser() {
    return MOCK_PLAYER;
}

let log = console.log

function getMockGame(options) {
    let g = new game.Game();
    g.players = [{
            "name": "p1",
            "googleid": "1",
            "score": 0,
        },
        {
            "name": "p2",
            "googleid": "2",
            "score": 2
        }
    ]
    g.host = {
        "name": "host",
        "googleid": "5",
    };
    if (options) {
        if (options.broadcastOverride) {
            g.broadcast = options.broadcastOverride
        }
        if (options.currentQuestion) {
            g.currentQuestion = options.currentQuestion
        }
        if (options.pastQuestions) {
            g.pastQuestions = options.pastQuestions
        }
        if (options.sendQuestion) {
            g.sendQuestion = options.sendQuestion
        }
        if (options.showScoreboard) {
            g.showScoreboard = options.showScoreboard
        }
    }
    return g;
}

describe("game.js", function () {
    
    describe("#generateGameCode", function () {
        it("should make a 6 digit code", function () {
            assert.equal(game.generateGameCode().length, 6);
        })
    })
    describe("#Game", function () {
        describe("#constructor()", function () {
                it("should have a random code", function () {
                    var g1 = new game.Game();
                    var g2 = new game.Game();
                    assert.notEqual(g1.code, g2.code);
                })
            }),
            describe("#setHost()", function () {
                var g = new game.Game();
                it("should set the host of the game to correctly", function () {
                    g.setHost(getMockUser(), "foo")
                    assert.equal(g.host.socket, "foo")
                })
            }),

            describe("#startGame()", function () {
                it("should set all players scores to zero", function () {
                    let g = getMockGame();
                    g.startGame();
                    g.players.forEach(player => {
                        assert.equal(player.score, 0)
                    })
                })
                it("should call sendQuestion", function (done) {
                    let g = getMockGame({
                        sendQuestion: () => {
                            assert.ok(true);
                            done()
                        }
                    });
                    g.sendQuestion();
                })
            })

        describe("#getCurrentAnswerByUser()", function () {
            let g = getMockGame({
                currentQuestion: {
                    userAnswers: [{
                            userid: "1",
                            answer: "one"
                        },
                        {
                            userid: "2",
                            answer: "two"
                        }
                    ]
                }
            });
            it("should get answer submitted by the user", function () {
                assert.equal(g.getCurrentAnswerByUser("1").answer, "one")
                assert.equal(g.getCurrentAnswerByUser("2").answer, "two")
            });
            it("should return undefined if there is no answer by that user", function () {
                assert.equal(g.getCurrentAnswerByUser("3"), undefined);
            })
            it("should throw an error is the user parameter is not a string", function () {
                assert.throws(() => g.getCurrentAnswerByUser({}))
            })
        })

        describe("#submitAnswer()", function () {
            let g = getMockGame({
                currentQuestion: {
                    userAnswers: [{
                        userid: "1",
                        answer: 0
                    }]
                },
                showScoreboard: function () {}
            })
            it("should throw an error if the user has already submitted an answer", function () {
                assert.throws(() => g.submitAnswer("1", 1))
            })
            it("should add the answer to the list", function () {
                g.submitAnswer("2", 5)
                assert.equal(g.getCurrentAnswerByUser("2").answer, 5)
            })
            it("should run showScoreboard if all the users have submitted", function (done) {
                g.showScoreboard = function () {
                    assert.ok(true)
                    done()
                }
                g.players = [0, 1]
                g.currentQuestion.userAnswers = []
                g.submitAnswer("0", 1)
            })
        })

        describe("#sortScoreboard()", function () {
            it("should sort players by their score", function () {
                let g = getMockGame()
                g.players = [{
                        "name": "second",
                        "score": 5
                    },
                    {
                        "name": "third",
                        "score": 4,
                    },
                    {
                        "name": "first",
                        "score": 10
                    }
                ]
                g.sortScoreboard()
                assert.equal(g.players[0].name, "first")
                assert.equal(g.players[1].name, "second")
                assert.equal(g.players[2].name, "third")
            })
        })

        describe("#showScoreboard()", function () {
            it("should run sortScoreboard", function(done){
                let g = getMockGame();
                g.sortScoreboard = function(){
                    assert.ok(true);
                    done();
                }
                g.showScoreboard()
            })

            it("should add the scores of all the players", function(){
                let g = getMockGame();
                g.currentQuestion = {
                    correctAnswer: 0,
                    userAnswers: [
                        {
                            "userid": "1",
                            "answer": 0
                        },
                        {
                            "userid": "2",
                            "answer": 1
                        },
                        {
                            "userid": "3",
                            "answer": 0
                        },
                        {
                            "userid": "4",
                            "answer": 3
                        },
                    ]
                }
                g.players = [
                    {
                        "googleid": "1",
                        "score": 0,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "2",
                        "score": 10,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "3",
                        "score": 25,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "4",
                        "score": 15,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    }
                ]
                g.sendToHost = (name, data) => {}
                g.showScoreboard();g.sendToHost = (name, data) => {}
                console.log(g.getPlayerByGoogleId("1").score)
                assert.equal(g.getPlayerByGoogleId("1").score, 9)
                assert.equal(g.getPlayerByGoogleId("2").score, 10)
                assert.equal(g.getPlayerByGoogleId("3").score, 32)
                assert.equal(g.getPlayerByGoogleId("4").score, 15)
            })
            
        })

        describe("#playerJSON()", function () {
            it("should remove all socket objects from the players", function(){
                let g = getMockGame()
                g.players = [
                    {
                        "googleid": "1",
                        "score": 0,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "2",
                        "score": 10,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "3",
                        "score": 25,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "4",
                        "score": 15,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    }
                ]
                let playerJSON = g.playerJSON();
                playerJSON.forEach((p) => {
                    assert.equal(p.socket, undefined);
                })
            })
        })

        describe("#toJSON()", function () {
            it("should only return information needed by the client", function(){
                let g = getMockGame();
                g.players = [
                    {
                        "googleid": "1",
                        "score": 0,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "2",
                        "score": 10,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "3",
                        "score": 25,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    },
                    {
                        "googleid": "4",
                        "score": 15,
                        "socket": {
                            emit: (name, data) => {}
                        }
                    }
                ]
                let gameJSON = g.toJSON()
                assert.equal(gameJSON.players[0].socket, undefined);
                assert.equal(gameJSON.code, g.code);
            })
        })

        describe("#join()", function () {
            it("should add the player to the players list", function(){
                let g = getMockGame();
                g.players = []
                g.join({
                    name: "foo"
                }, "bar")
                assert.equal(g.players[0].name, "foo")
                assert.equal(g.players[0].socket, "bar")
            })
        })

        describe("#broadcastLobbyStatus()", function () {
            it("should broadcast the lobby's status", function(done){
                let g = getMockGame();
                g.broadcast = (name, data) => {
                    assert.equal(name, "updateLobbyStatus")
                    assert.equal(data.game.code, g.code);
                    done()
                }
                g.broadcastLobbyStatus()
            })
        })

        describe("#sendQuestion", function (done) {
            it("should set the currentQuestion to the test question", function () {
                let g = getMockGame({
                    broadcastOverride: (name, data) => {
                        assert.equal(name, "showQuestion")
                        assert.equal(data.userAnswers, [])
                        done()
                    }
                });
                g.sendQuestion()
            })
        })

        describe("#broadcast()", function () {
            it("should run socket.io broadcast", function(){
                assert.ok(true)
            })
        })

        describe("#sendToHost()", function () {
            it("should only emit to the host", function(done){
                let g = getMockGame()
                g.host = {
                    socket: {
                        emit: 
                            (name, data) => {
                                assert.equal(name, "test")
                                done();
                            }
                    }
                }
                g.sendToHost("test", {})
            })
        })
    })
})