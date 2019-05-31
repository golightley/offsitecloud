const functions = require('firebase-functions');
// import * as functions from 'firebase-functions';
// const admin = require('firebase-admin');
const admin = require('firebase-admin');
// admin.initializeApp();
admin.initializeApp(functions.config().firebase);

// configure sendgrid
const SENDGRID_API_KEY = functions.config().sendgrid.key;
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(SENDGRID_API_KEY);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//


// send invite email with sendgrid 
exports.firestoreEmail = functions.https.onRequest((request, response) => {
    const email = JSON.parse(request.body).email;
    const userId = JSON.parse(request.body).userId;
    const team = JSON.parse(request.body).team;
    const teamName = JSON.parse(request.body).teamName;
    const teamId = JSON.parse(request.body).teamId;

    admin.firestore().collection('emailInvites').add({
        name: 'test',
        email: email,
        team: team,
        teamId: teamId,
        active: true,
        teamName: teamName,
        user: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    }).then(function (docRef) {
        console.log('Email invite written with ID: ', docRef.id);
        const msg = {
            to: email,
            from: 'Offsite<test@offsite.com>',
            subject: 'You have been invited by a co-worker to join Offsite',
            // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
            templateId: 'd-5bcdc869970a4a269fb044c40341edac',
            dynamic_template_data: {
                name: '',
                subject: 'You have been invited by a co-worker to join Offsite',
                team: team,
                teamName: teamName,
                teamId: teamId
            }
        };
        // send data to send grid
        sgMail.send(msg)
            .then(() => {
                console.log(' mail sent success');
                response.send('Your teammates is invited successfully');
            })
            .catch(err => {
                console.log(err);
                response.send('Error occurred during invite teammates');
            });
    }).catch(function (error) {
        console.error('Error adding email invite document: ', error);
        response.send('Error occurred during invite teammates');
    });

});

const sendNotication = (owner_uid, type) => {

    // print out the info to make sure it is right 
    console.log("Inside the cloud messaging, send notification function")
    console.log(owner_uid)
    console.log(type)

    // return new Promise((resolve,reject)=>{
    // get token from users collection 
    admin.firestore().collection("users").doc(owner_uid).get().then((doc) => {
        // if(doc.exists && doc.data().token){
        // will need to add different types
        // if(type == true){
        admin.messaging().sendToDevice(doc.data().token, {
            data: {
                title: "New notification",
                sound: "default",
                body: "Tap to check"
            }
        }).then((sent) => {
            console.log("ready to resolve")
            console.log(sent)

            // resolve(sent)
        }).catch((error) => {
            console.log("error resolving cloud messaging")
            console.log(error)
            // reject(error)
        })
        // }

        // }
    })

    // })


}

exports.helloWorld = functions.https.onRequest((request, response) => {
    console.log('hello world');
    response.send("Hello from Firebase!");
});

exports.createPulseChecks = functions.https.onRequest((request, response) => {

    //get team id
    const teamId = JSON.parse(request.body).teamId;
    const userId = JSON.parse(request.body).userId;
    const isTeamCreate = JSON.parse(request.body).isTeamCreate; // if create team then 'create', if join team then 'join'
    console.log(request.body)
    console.log("Team id:" + teamId);

    if (teamId != null && userId != null) {
        // get each team that has been created
        return new Promise((resolve, reject) => {
            admin.firestore().collection("teams")
                .doc(teamId)
                .get()
                .then((team) => {

                    console.log(team)
                    console.log(team.data())
                    console.log(team.data().members)
                    console.log(team.data().memembersids)
                    console.log(team.data().createdBy)
                    
                    // create new surveys for current user
                    newSurvey(team, userId, isTeamCreate);   
                    console.log("generate initial notification for current user");
                    initialNotifications(team, userId);                 
                    response.send("Created new surveys");
                })
        })
    } else {
        // get each team that has been created
        return new Promise((resolve, reject) => {
            admin.firestore().collection("teams").get().then((teams) => {
                console.log(teams)
                let teamsArray = [];
                this.teamsArray = teams;
                this.teamsArray.forEach(team => {
                    // if(team.active){
                    // create new surveys for each team
                    newSurvey(team, userId, isTeamCreate);
                    //initial norificaitons 
                    initialNotifications(team, userId);

                    // create new question
                    let teamArray = [];
                    teamArray = team.data().membersids;

                    // create notifications for each team member
                    teamArray.forEach(uid => {
                        sendNotication(uid, "Notification")
                    })
                    // }
                })
                response.send("Created new surveys");
            })
        })


    }






});

function newSurvey(team, userId, isTeamCreate) {
    console.log("Ready to create a survey for this team...");
    console.log(team);
    if( isTeamCreate == 'create' ){
        var docData = {
            active: true,
            displayName: team.data().teamName,
            categories: "Pulse check",
            surveyType: "pulse",
            teamId: team.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
    
        };
        // create a new survey for the feedback request 
        admin.firestore().collection("surveys").add(docData)
            .then(function (docRef) {
                console.log("Survey Document written with ID: ", docRef.id);
                const surveyID = docRef.id;
                newNotification(team, surveyID, userId);
                newQuestions(team, surveyID, userId)
            }).catch(function (error) {
                console.error('Error creating sruvey document: ', error);
            });
    } else if( isTeamCreate == 'join' ) {
        admin.firestore().collection("surveys")
            .doc(team.id)
            .get()
            .then((survey) => {
                newNotification(team, survey.id, userId);
                newQuestions(team, surveyID, userId)
            });
    }
    
}


function newNotification(team, surveyId, userId) {
    console.log("Ready to create a survey of current user for this team...");
    console.log(team);

    // var teamMembers = team.data().memembersids;    
    // loop through each team member and send a notificastion 

    // save the data for the noticiation
    var docData = {
        active: false,
        displayName: team.data().teamName,
        categories: "Pulse check",
        type: "pulse",
        teamId: team.id,
        user: userId,
        survey: surveyId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // create a new survey for the feedback request 
    admin.firestore().collection("surveynotifications").add(docData)
        .then(function (docRef) {
            console.log("Notification Document written with ID: ", docRef.id);
            const surveyID = docRef.id;            
        }).catch(function (error) {
            console.error('Error creating sruvey document: ', error);
        });
    
}

function initialNotifications(team, userId) {

    // var teamMembers = team.data().memembersids;
    // save the data for the noticiation
    var docData = {
        active: true,
        message: "Ask team for anonymous feedback",
        type: "feedback-ask",
        teamId: team.id,
        user: userId,
        link: '/app/feedback',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // create a new survey for the feedback request 
    admin.firestore()
        .collection("surveynotifications")
        .add(docData)
        .then(function (docRef) {
            const surveyID = docRef.id;
        }).catch(function (error) {
            console.error('Error creating sruvey document: ', error);
        });

    // save the data for the noticiation
    var docData = {
        active: true,
        message: "Suggest an idea to your team",
        type: "instructional",
        teamId: team.id,
        user: userId,
        link: '/app/ideas',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // // create a new survey for the feedback request 
    admin.firestore()
        .collection("surveynotifications")
        .add(docData)
        .then(function (docRef) {
            const surveyID = docRef.id;
        }).catch(function (error) {
            console.error('Error creating sruvey document: ', error);
        });

}

function newQuestions(team, surveyId, userId) {
    console.log("New questions for this team...");
    
    // create an array of members in the team
    /*let teamMembersArray = [];
    var teamMembers = team.data().members;
    for (var member in teamMembers) {
        teamMembersArray.push(member);
    }
    console.log(teamMembersArray);*/

    console.log("Ready to create new questions for user...");
    // create a new survey for the feedback request 
    admin.firestore().collection('questionTemplate').where('category', '==', "Pulse check").get()
        .then(function (questionTemplate) {
            questionTemplate.forEach((templates) => {
                let questions = [];
                questions = templates.data().Questions;
                questions.forEach(question => {
                    let questionText = "";
                    if (question.type == "input") {
                        questionText = "What are examples of " + name + "'s " + question.question;
                    } else {
                        questionText = question.question;
                    }
                    console.log(question)
                    admin.firestore().collection('questions').add({
                        active: true,
                        Question: questionText,
                        type: question.type,
                        user: userId,
                        surveys: [surveyId],
                        teamId: team.id,
                        goal: "pulse",
                        timestamp: admin.firestore.FieldValue.serverTimestamp()

                    }).then(function (docRef) {
                        console.log('Survey question written with ID: ', docRef.id);
                    }).catch(function (error) {
                        console.error('Error adding document: ', error);
                    });
                });
            })
        }).catch(function (error) {
            console.error('Error creating sruvey document: ', error);
        });
}


exports.updateLikesCount = functions.https.onRequest((request, response) => {
    console.log("Update likes function");

    console.log("Body-->");

    const questId = JSON.parse(request.body).questId;
    const userId = JSON.parse(request.body).userId;
    const action = JSON.parse(request.body).action;

    console.log(request.body);
    // const questId  = request.body.questId;
    // const userId   = request.body.userId;
    // const action   = request.body.action;

    console.log(questId);
    console.log(userId);
    console.log(action);

    admin.firestore().collection("questions").doc(questId).get().then((data) => {


        let likesCount = data.data().likesCount || 0;
        let likes = data.data().likes || [];

        let updateData = {};
        // updateData["likesCount"] = 10;
        // updateData[`likes.${'AKfOgVZrSTYsYN01JA0NUTicf703'}`] = true;

        if (action == "like") {
            updateData["likesCount"] = ++likesCount;
            updateData[`likes.${userId}`] = true;

        } else {
            updateData["likesCount"] = --likesCount;
            updateData[`likes.${userId}`] = false;
        }

        admin.firestore().collection("questions").doc(questId).update(updateData).then(() => {
            response.status(200).send("Done")
        }).catch((err) => {
            response.status(err.code).send(err.message);
        })

    }).catch((err) => {
        response.status(err.code).send(err.message);
    })


})


exports.createFeedbackRequest = functions.https.onRequest((request, response) => {
    console.log("Create feedback function");
    console.log("Body-->");

    // get all of the variables we need
    // variables needed: array of team members, category, userID
    const teamArray = JSON.parse(request.body).team;
    const userId = JSON.parse(request.body).userId;
    const category = JSON.parse(request.body).category;
    const displayName = JSON.parse(request.body).displayName;



    console.log(request.body);
    console.log(teamArray);
    console.log(userId);
    console.log(category);



    var docData = {
        active: true,
        userId: userId,
        categories: category,
        surveyType: "feedback",
        arrayExample: teamArray,
        displayName: displayName
    };

    // create a new survey for the feedback request 
    admin.firestore().collection("surveys").add(docData)
        .then(function (docRef) {
            console.log("Document written with ID: ", docRef.id);
            const surveyID = docRef.id;


            // create notificaitons for each category selected 
            // create notifications for each team member selected
            // categories.forEach(category => {
            // console.log("Creating notification for: ", category)
            //make sure the user selected the name 
            // if (category.checked == true){
            // create notifications for each team member selected
            teamArray.forEach(element => {
                console.log("Creating notification for: ", element)
                //make sure the user selected the name 
                if (element.checked == true) {
                    // don't send notification for yourself
                    // if(element.userId!=userId){
                    var notificationData = {
                        active: true,
                        user: element.userId,
                        survey: surveyID,
                        name: displayName + " requested feedback on " + category,
                    };
                    admin.firestore().collection("surveynotifications").add(notificationData)
                        .then(function (docRef) {
                            console.log("Notification written with ID: ", docRef.id);
                            const surveyID = docRef.id;
                            sendNotication(element.userId, "Notification");
                        })
                        .catch(function (error) {
                            console.error("Error adding document: ", error);
                        });
                    // }
                }
            });
        })
        .catch(function (error) {
            console.error("Error adding document: ", error);
        });

})


// update reddit score 
exports.updateScore = functions.https.onRequest((request, response) => {
    console.log("Update score function");

    console.log("Body-->");

    const questId = JSON.parse(request.body).questId;
    const userId = JSON.parse(request.body).userId;
    const action = JSON.parse(request.body).action;

    console.log(request.body);
    console.log(questId);
    console.log(userId);
    console.log(action);

    admin.firestore().collection("comments").doc(questId).get().then((data) => {


        let score = data.data().score || 0;
        let upvotes = data.data().upvotes || [];
        let downvotes = data.data().downvotes || [];

        let updateData = {};;

        if (action == "upvote") {
            updateData["score"] = ++score;
            updateData[`upvotes.${userId}`] = true;

        } else {
            updateData["score"] = --score;
            updateData[`downvotes.${userId}`] = false;
        }

        admin.firestore().collection("comments").doc(questId).update(updateData).then(() => {
            response.status(200).send("Done")
        }).catch((err) => {
            response.status(err.code).send(err.message);
        })

    }).catch((err) => {
        response.status(err.code).send(err.message);
    })


})


// update reddit score 
exports.updateIdeaScore = functions.https.onRequest((request, response) => {
    console.log("Update score function");

    console.log("Body-->");

    const teamId = JSON.parse(request.body).team;
    const userId = JSON.parse(request.body).userId;
    const action = JSON.parse(request.body).action;

    console.log(request.body);
    console.log(userId);
    console.log(action);

    admin.firestore().collection("ideas").doc(teamId).get().then((data) => {


        let score = data.data().score || 0;
        let upvotes = data.data().upvotes || [];
        let downvotes = data.data().downvotes || [];

        let updateData = {};;

        if (action == "upvote") {
            updateData["score"] = ++score;
            updateData[`upvotes.${userId}`] = true;

        } else {
            updateData["score"] = --score;
            updateData[`downvotes.${userId}`] = false;
        }

        admin.firestore().collection("ideas").doc(teamId).update(updateData).then(() => {
            response.status(200).send("Done")
        }).catch((err) => {
            response.status(err.code).send(err.message);
        })

    }).catch((err) => {
        response.status(err.code).send(err.message);
    })


})


// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest((req, res) => {
    console.log("Add message function");
    console.log(req.query.text);
    // Grab the text parameter.
    const original = req.query.text;
    // Push the new message into the Realtime Database using the Firebase Admin SDK.
    return admin.database()
        .ref('/messages').push({
            original: original
        }).then((snapshot) => {
            // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
            return res.redirect(303, snapshot.ref.toString());
        });
});

// keep track of comments per question using firestore trigger 
exports.updateCommentsCount = functions.firestore
    .document('comments/{commentsId}')
    .onCreate(async (snap, context) => {

        //get the details about the comment
        let data = snap.data();

        //get the questionId from the data returned above
        let questId = data.questionId;

        // get the question document to update. Use await instead of promise
        let doc = await admin.firestore().collection("questions").doc(questId).get();

        // update the data object 
        if (doc.exists) {
            let commentsCount = doc.data().commentsCount || 0;
            commentsCount++;

            await admin.firestore().collection("questions").doc(questId).update({
                "commentsCount": commentsCount
            })
            return true;
        } else {

            //document did not exist
            return false;
        }

    });


// keep track of comments per question using firestore trigger 
exports.addQuestionToSurvey = functions.firestore
    .document('surveys/{surveysId}')
    .onCreate(async (snap, context) => {

        //get the details about the comment
        let data = snap.data();
        let surveyId = snap.id;

        // determine if survey is a team survey or a feedback request
        let surveyType = data.surveyType;

        // get the categroy
        let category = data.category;

        let user = data.userId;


        console.log("Survey document created")
        console.log(data);
        console.log(surveyType);

        let template = [{
                type: "multiple",
                question: "Please rate Liam's " + category + "ability"
            },
            {
                type: "input",
                question: "What is Liam good at? " + category
            },
            {
                type: "input",
                question: "What is Liam bad at? " + category
            },

        ];

        // if type == feedback then get the category
        if (surveyType == "feedback") {
            template.forEach(element => {

                var questionData = {
                    active: true,
                    surveys: [surveyId],
                    type: element.type,
                    users: [user],
                    Question: element.question,
                };
                admin.firestore().collection("questions").add(questionData)
                    .then(function (docRef) {
                        console.log("Question written with ID: ", docRef.id);
                        const surveyID = docRef.id;
                    })
                    .catch(function (error) {
                        console.error("Error adding document: ", error);
                    });

            });


        }

        // select the question type based on the category
        // create the questions 



        // get the question document to update. Use await instead of promise
        // let doc = await admin.firestore().collection("questions").doc(questId).get();

        // // update the data object 
        // if(doc.exists){
        //     let commentsCount = doc.data().commentsCount || 0;
        //     commentsCount++;

        //     await admin.firestore().collection("questions").doc(questId).update({
        //         "commentsCount": commentsCount
        //     })
        //     return true;
        // } else{

        //     //document did not exist
        //     return false;
        // }

    });