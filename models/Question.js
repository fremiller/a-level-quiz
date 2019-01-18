/**
 * @typedef {Object} Question
 * @property {string} question The content of the question
 * @property {string} type The type of the question (always EXAM)
 * @property {string} timeLimit The question's time limit
 * @property {string[]} answers All possible answers to the question
 * @property {number} correctAnswer The correct answer to the question
 * @property {string} exam The exam that the question was from (if applicible)
 */

var QuestionSchema = {
    question: String,
    type: String,
    timeLimit: Number,
    answers: [String],
    correctAnswer: Number,
    exam: String,
};

if(exports){
    exports.Schema = QuestionSchema
}