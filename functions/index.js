const functions = require('firebase-functions');
// import * as functions from 'firebase-functions';
// const admin = require('firebase-admin');
const admin = require('firebase-admin');
// admin.initializeApp();
admin.initializeApp(functions.config().firebase);

// configure sendgrid
const SENDGRID_API_KEY = functions.config().sendgrid.key
const sgMail           = require('@sendgrid/mail');
sgMail.setApiKey(SENDGRID_API_KEY);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//


// send invite email with sendgrid 
exports.firestoreEmail = functions.firestore
    .document('emailInvites/{emailInvitesId}')
    .onCreate((snap, context) => {
        // Get an object representing the document
        // e.g. {'name': 'Marie', 'age': 66}
        const newValue = snap.data();
  
        // access a particular field as you would any JS property
        const name  =  newValue.name;
        const email =  newValue.email;
        console.log("sending to "+name+ " at "+email)

        // create email template in format required by sendGrid
        // const msg = {
        //     to: 'golightley@gmail.com',
        //     from: 'hello@angularfirebase.com',
        //     subject:  'New Follower',
        //     // text: `Hey ${toName}. You have a new follower!!! `,
        //     // html: `<strong>Hey ${toName}. You have a new follower!!!</strong>`,

        //     // custom templates
        //     templateId: 'd-db4ed9fdd91142299b70d02a0cc1477a',
        //     substitutionWrappers: ['{{', '}}'],
        //     substitutions: {
        //       name: name
        //       // and other custom properties here
        //     }
        // };

        const msg = {
            to: email,
            from: 'test@offsite.com',
            subject: 'You have been invited by a co-worker to join Offsite',
            // text: 'and easy to do anywhere, even with Node.js',
            // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
            templateId: 'd-5bcdc869970a4a269fb044c40341edac',
            dynamic_template_data: {
                name: newValue.name,
                subject:'You have been invited by a co-worker to join Offsite'
                // and other custom properties here
                }
          };
          
         // send data to send grid
         return sgMail.send(msg)
                .then(() => console.log(' mail sent success'))
                .catch(err => console.log(err))
                console.log("Email sent")
      });



    // .onCreate(event => {
    //     console.log("Event");
    //     console.log(event);

        
    //     const emailInviteId = event.params.emailInvitesId;
    //     const db            = admin.firestore()


    //     return db.collection('emailInvites').doc(emailInviteId)
    //     .get()
    //     .then(doc => {

    //         const email = doc.data()

    //         const msg = {
    //             to: email.email,
    //             from: 'hello@angularfirebase.com',
    //             subject: 'New Invite',
    //             templateId:'d-db4ed9fdd91142299b70d02a0cc1477a',
    //             substitutionWrappers: ['{{','}}'],
    //             substitutions:{
    //                 name: email.displayName
    //             }

    //         };
            
    //         return sgMail.send(msg);

    //     })
    //     .then(() => console.log('email sent!'))
    //     .catch(err => console.log(err))

    // })

// exports.helloWorld = functions.https.onRequest((request, response) => {
//     response.send("Hello from Firebase!");
//    });
   



const sendNotication = (owner_uid, type) => {

    // print out the info to make sure it is right 
    console.log("Inside the cloud messaging, send notification function")
    console.log(owner_uid)
    console.log(type)

    return new Promise((resolve,reject)=>{
            // get token from users collection 
        admin.firestore().collection("users").doc(owner_uid).get().then((doc)=>{
            if(doc.exists && doc.data().token){
                // will need to add different types
                // if(type == true){
                    admin.messaging().sendToDevice(doc.data().token, {
                        data:{
                            title: "New notification",
                            sound: "default",
                            body:"Tap to check"
                        }
                    }).then((sent)=>{
                        console.log("ready to resolve")
                        console.log(sent)

                        resolve(sent)
                    }).catch((error)=>{
                        console.log("error resolving cloud messaging")
                        console.log(error)
                        reject(error)
                    })
                // }

            }
        })

    })


}

exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});



exports.updateLikesCount = functions.https.onRequest((request, response) => {
    console.log("Update likes function");

    console.log("Body-->");

    const questId  = JSON.parse(request.body).questId;
    const userId   = JSON.parse(request.body).userId;
    const action   = JSON.parse(request.body).action;

    console.log(request.body);
    // const questId  = request.body.questId;
    // const userId   = request.body.userId;
    // const action   = request.body.action;

    console.log(questId);
    console.log(userId);
    console.log(action);

    admin.firestore().collection("questions").doc(questId).get().then((data) => {
    

        let likesCount  = data.data().likesCount || 0;
        let likes       = data.data().likes      || [];

        let updateData = {};
        // updateData["likesCount"] = 10;
        // updateData[`likes.${'AKfOgVZrSTYsYN01JA0NUTicf703'}`] = true;

        if(action =="like"){
            updateData["likesCount"] = ++likesCount;
            updateData[`likes.${userId}`] = true;

        }else{
            updateData["likesCount"] = --likesCount;
            updateData[`likes.${userId}`] = false;
        }

        admin.firestore().collection("questions").doc(questId).update(updateData).then(()=>{
            response.status(200).send("Done")
        }).catch((err)=>{
            response.status(err.code).send(err.message);
        })

    }).catch((err)=>{
        response.status(err.code).send(err.message);
    })


})


exports.createFeedbackRequest = functions.https.onRequest((request, response) => {
    console.log("Create feedback function");
    console.log("Body-->");

    // get all of the variables we need
    // variables needed: array of team members, category, userID
    const teamArray     = JSON.parse(request.body).team;
    const userId        = JSON.parse(request.body).userId;
    const category      = JSON.parse(request.body).category;
    const displayName   = JSON.parse(request.body).displayName;



    console.log(request.body);
    console.log(teamArray);
    console.log(userId);
    console.log(category);



    var docData = {
        active: true,
        userId: userId,
        categories:category,
        surveyType:"feedback",
        arrayExample: teamArray,
        displayName:displayName
    };

    // create a new survey for the feedback request 
    admin.firestore().collection("surveys").add(docData)
    .then(function(docRef) {
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
                if (element.checked == true){
                    // don't send notification for yourself
                    // if(element.userId!=userId){
                    var notificationData = {
                        active: true,
                        user: element.userId,
                        survey: surveyID,
                        name: displayName + " requested feedback on " + category,
                    };
                    admin.firestore().collection("surveynotifications").add(notificationData)
                    .then(function(docRef) {
                        console.log("Notification written with ID: ", docRef.id);
                        const surveyID = docRef.id; 
                        sendNotication(element.userId,"Notification");
                    })
                    .catch(function(error) {
                        console.error("Error adding document: ", error);
                    });
                // }
            }
            });
    // }
    // });






    // pick questions to include in the survey 


    })
    .catch(function(error) {
        console.error("Error adding document: ", error);
    });
    
})


    // update reddit score 
exports.updateScore = functions.https.onRequest((request, response) => {
    console.log("Update score function");

    console.log("Body-->");

    const questId  = JSON.parse(request.body).questId;
    const userId   = JSON.parse(request.body).userId;
    const action   = JSON.parse(request.body).action;

    console.log(request.body);
    console.log(questId);
    console.log(userId);
    console.log(action);

    admin.firestore().collection("comments").doc(questId).get().then((data) => {
    

        let score      = data.data().score || 0;
        let upvotes    = data.data().upvotes          || [];
        let downvotes  = data.data().downvotes      || [];

        let updateData = {};
;

        if(action =="upvote"){
            updateData["score"] = ++score;
            updateData[`upvotes.${userId}`] = true;

        }else{
            updateData["score"] = --score;
            updateData[`downvotes.${userId}`] = false;
        }

        admin.firestore().collection("comments").doc(questId).update(updateData).then(()=>{
            response.status(200).send("Done")
        }).catch((err)=>{
            response.status(err.code).send(err.message);
        })

    }).catch((err)=>{
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
    .ref('/messages').push({original: original}).then((snapshot) => {
      // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
      return res.redirect(303, snapshot.ref.toString());
    });
  });

// keep track of comments per question using firestore trigger 
exports.updateCommentsCount = functions.firestore
.document('comments/{commentsId}')
.onCreate(async(snap, context) => {
    
    //get the details about the comment
    let data = snap.data();

    //get the questionId from the data returned above
    let questId = data.questionId;

    // get the question document to update. Use await instead of promise
    let doc = await admin.firestore().collection("questions").doc(questId).get();

    // update the data object 
    if(doc.exists){
        let commentsCount = doc.data().commentsCount || 0;
        commentsCount++;

        await admin.firestore().collection("questions").doc(questId).update({
            "commentsCount": commentsCount
        })
        return true;
    } else{
        
        //document did not exist
        return false;
    }

});


// keep track of comments per question using firestore trigger 
exports.addQuestionToSurvey = functions.firestore
.document('surveys/{surveysId}')
.onCreate(async(snap, context) => {
    
    //get the details about the comment
    let data = snap.data();
    let surveyId   = snap.id;

    // determine if survey is a team survey or a feedback request
    let surveyType = data.surveyType;

    // get the categroy
    let category = data.category;

    let user = data.userId;


    console.log("Survey document created")
    console.log(data);
    console.log(surveyType);

    let template = [
        {
            type:"multiple",
            question:"Please rate Liam's "+category + "ability"
        },
        {
            type:"input",
            question:"What is Liam good at? "+category 
        },
        {
            type:"input",
            question:"What is Liam bad at? "+category 
        },

    ];

    // if type == feedback then get the category
    if(surveyType == "feedback"){
        template.forEach(element => {

            var questionData = {
                active: true,
                surveys: [surveyId],
                type:element.type,
                users:[user],
                Question: element.question,
            };
            admin.firestore().collection("questions").add(questionData)
            .then(function(docRef) {
                console.log("Question written with ID: ", docRef.id);
                const surveyID = docRef.id; 
            })
            .catch(function(error) {
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