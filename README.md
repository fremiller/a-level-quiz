# a-level-quiz

This is my A Level Computer Science Project

It is a quiz for A level physics students to help them revise the multiple choice questions.

See the website [here](https://a-level-quiz.herokuapp.com) for the latest version

There is google classroom integration in the project, which makes it easy for teachers and students to create and join games

At the moment, games can only be played based on the questions in `quizconfig.json`, however, there will be a question creation tool in the future

# Directory Structure

```
/
├───public - Files served by the web server
├───client_src - Client side scripts
├───test - Unit tests (not finished)
├───src - Server side scripts
├───package.json - npm package json
└───server.js - Main server file
```

# Building and running

In the root directory, run `npm install` then `npx tsc`
Mongodb server required on the server

Default port: `8000`
