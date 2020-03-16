const Alexa = require('ask-sdk-core');
const request = require('request');
const stringSimilarity = require('string-similarity');

function getQuestion(callback) {
  return new Promise(function(resolve, reject) {
    request('https://opentdb.com/api.php?amount=1&category=23', { json: true }, function(err, res, body) {
      if (err) {
        console.log(err);
      } 
      else {
        callback(body);
      }
    })
  })
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function get_match_scores(user_answer, answer_list) {
  var matching_scores = []
  for (const index in answer_list) {
    matching_scores.push(stringSimilarity.compareTwoStrings(user_answer, answer_list[index]))
  }
  return matching_scores
}

function validate_response(answer_options, user_answer, matching_scores) {
  return answer_options.includes(user_answer) || (Math.max(...matching_scores) >= 0.8)
}

function correct_response(user_answer, attributes) {
  return stringSimilarity.compareTwoStrings(user_answer, attributes.correct_answer) >= 0.8 || user_answer === attributes.correct_option
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = "Welcome to History Trivia! To begin, please say a phrase like ask me a question";
    return handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(false).getResponse();
  },
};

const QuizHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'QuestionIntent';
  },
  handle(handlerInput) {
    return new Promise((resolve) => {
      getQuestion((result) => {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        var question = result.results[0].question;
        var answer = result.results[0].correct_answer.toLowerCase()
        var incorrect_answers = result.results[0].incorrect_answers

        attributes.question = question
        attributes.correct_answer = answer
        
        var answers_list = []
        for (const index in incorrect_answers) {
          answers_list.push(incorrect_answers[index].toLowerCase())
        }
        answers_list.push(answer)
        var shuffled_list = shuffle(answers_list)
        var answer_options = "";
        var letter_options = ["a", "b", "c", "d"]
        for (const index in shuffled_list) {
          if (index == shuffled_list.length - 1) {
            answer_options += `or ${letter_options[index]}: ${shuffled_list[index]}`
          }
          else {
            answer_options += `${letter_options[index]}: ${shuffled_list[index]}, `; 
          }
          if (attributes.correct_answer === shuffled_list[index]) {
              attributes.correct_option = letter_options[index]
            }
        }
        attributes.answer_text = `Is it ${answer_options}`
        attributes.answer_list = shuffled_list
        attributes.answer_options = letter_options.slice(0, letter_options.length)
        
        const speakOutput = `${question} ${answer_options}`;

        resolve(handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(false).getResponse());
      })
    });
  },
};

const AnswerHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    return new Promise((resolve) => {
      getQuestion((result) => {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        var user_answer = handlerInput.requestEnvelope.request.intent.slots.answer.value.toLowerCase()
        var speakOutput = "answer handler"
        var matching_scores = get_match_scores(user_answer, attributes.answer_list)
        if (!validate_response(attributes.answer_options, user_answer, matching_scores)) {
            speakOutput = `I am sorry, that was not a valid response. Plase select between ${attributes.answer_list}`
        }
        else {
          if (correct_response(user_answer, attributes)) {
            speakOutput = `Correct! That is the right answer`;
          }
          else {
            speakOutput = `I am sorry but that is incorrect. The correct answer is ${attributes.correct_answer}`
          }
        }
        resolve(handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(false).getResponse());
      })
    });
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = `Welcome to History Trivia! To begin, please say a phrase like ask me a question. When you are ready to give your answer, say: 'my answer is *insert response*' `;

    return handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(false).getResponse();
  },
};

const CancelAndStopHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    QuizHandler,
    AnswerHandler,
    HelpHandler,
    CancelAndStopHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
