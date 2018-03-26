//BOT Builder (Bot)
var restify = require('restify');
var builder = require('botbuilder');
//Google Cal (GC)
var google = require('googleapis');
var googleAuth = require('google-auth-library');
//Generic
var fs = require('fs');
var path = require('path');

//GC - Vars
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var credentials = {};
var oauth2Client = null;

//GC - Load Client Secret and store
fs.readFile(path.normalize("./client_secret.json"), function processClientSecrets(err, content) {//Remove
    if (err) {
        console.log('Error loading client secret file: ' + err);
        process.exit(1); //fatal error exit
    }
    //credentials {} contaions client secret
    credentials = JSON.parse(content);
});

//BOT - Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

//BOT - Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

//BOT - Listen for messages from users 
server.post('/api/messages', connector.listen());
var inMemoryStorage = new builder.MemoryBotStorage();

//BOT - Default dialog (Main Dialog) 
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog('init', session.conversationData.events);
    },
    function (session) {
        builder.Prompts.choice(session, "Select a operation?", ["Add Event", "View Events", "Push event to Google", "View upcomming Google Events", "Remove Event", "End All Events"], {
            listStyle: 3
        });
    },
    function (session, results) {
        if (results.response.entity == "Add Event") {
            session.beginDialog("addEvent");
        } else if (results.response.entity == "End All Events") {
            session.beginDialog("quit");
        } else if (results.response.entity == "Push event to Google") {
            session.beginDialog("pushG");
        } else if (results.response.entity == "View upcomming Google Events") {
            session.beginDialog("getGC10");
        } else if (results.response.entity == "Remove Event") {
            session.beginDialog("rm-e");
        } else {
            session.beginDialog("viewEvent");
        }
    },
    function (session) {
        //Restart
        session.beginDialog('/');
    }
]).set('storage', inMemoryStorage);
/*Dialogs beyond this point*/
//----------------------------------------------------------------------------------------------------------------------
//BOT - Dialog - Data Container creator
bot.dialog('init', [function (session, args) {
    session.conversationData.events = args || [];
    session.endDialog();
}]);

//BOT - Dialog - Add Event
bot.dialog('addEvent', [
    function (session) {
        session.dialogData.event = {
            "Title": "",
            "Time": "",
            "Description": ""
        };
        builder.Prompts.text(session, "Input title of the event: ");
    },
    function (session, results) {
        session.dialogData.event.Title = results.response;
        builder.Prompts.time(session, "Input Date and Time of event: ");
    },
    function (session, results) {
        session.dialogData.event.Time = builder.EntityRecognizer.resolveTime([results.response]);
        builder.Prompts.text(session, "Input Event discription: ");
    },
    function (session, results) {
        session.dialogData.event.Description += results.response;
        session.conversationData.events.push(session.dialogData.event);
        session.endDialog("Event entered. Successfully.");

    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entry operation. Are you sure?"
    });

//BOT - Dialog - View Event
bot.dialog('viewEvent', function (session) {
    var c, x = 0;
    /*for(c in session.conversationData.events){
		x++;
		session.send("Memo "+x+":\nTitle: "+c.events.name+"\nEvent Time: "+c.date+"\nDescription: "+c.desc+"\nStatus: "+c.st);
    }*/
    session.conversationData.str = "";
    if (session.conversationData.events.length == 0) {
        session.say("No Memo is active, to add a memo click on add event.");
    } else {
        for (i = 0; i < session.conversationData.events.length; i++) {
            session.conversationData.str += "Memo " + (i + 1) + "<br>";
            for (item in session.conversationData.events[i]) {
                if (item == "Time") {
                    session.conversationData.str += item + ": " + new Date(session.conversationData.events[i][item]).toLocaleString() + "<br>";
                } else session.conversationData.str += item + ": " + session.conversationData.events[i][item] + "<br>";
            }
            session.conversationData.str += "<br>" + "<br>"
        }
        session.say(session.conversationData.str);
    }
    session.endDialog();
}).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    }
);

//BOT - Dialog - Remove operation
bot.dialog('rm-e', [
    function (session) {
        session.beginDialog('viewEvent');
    },
    function (session) {
        if (session.conversationData.events.length == 0) {
            session.endDialog("Noting to delete....");
        } else builder.Prompts.number(session, "Input the memo number to be deleted: ");
    },
    function (session, results) {
        if (results.response > 0 && results.response <= session.conversationData.events.length) {
            session.conversationData.events.splice(results.response - 1, 1);
            session.endDialog("Successfully Deleted.....");
        } else {
            session.endDialog("You inserted a wrong Memo number.");
        }
    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    });



//--------------------------------------------------------------------------------------------------------------------
//GC + BOT

bot.dialog('getGC10', [
    function (session) {
        session.beginDialog('initGC');
    },
    function (session) {
        var calendar = google.calendar('v3');
        calendar.events.list({
            auth: oauth2Client,
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        }, function (err, response) {
            if (err) {
                session.endDialog('The API returned an error: ' + err);
                return;
            }
            var events = response.items;
            if (events.length == 0) {
                session.endDialog('No recent events found.');
            } else {
                session.conversationData.str = 'Recent 10 events: <br>';
                for (var i = 0; i < events.length; i++) {
                    var event = events[i];
                    var start = event.start.dateTime || event.start.date;
                    session.conversationData.str += start + ' - ' + event.summary + "<br>";
                }
                session.endDialog(session.conversationData.str);
            }
        });
    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    });


bot.dialog('pushG', [
    function (session) {
        session.beginDialog('viewEvent');
    },
    function (session) {
        if (session.conversationData.events.length == 0) {
            session.endDialog("Noting present that could be pushed....");
        } else {
            builder.Prompts.number(session, "Input the memo number to be Pushed (Insert '0' to PushAll): ");
        }
    },
    function (session, results) {
        session.conversationData.str = results.response;
        if (session.conversationData.str > 0 && session.conversationData.str <= session.conversationData.events.length) {
            session.beginDialog('flushGC', results.response);
        } else if (session.conversationData.str == 0) {
            session.beginDialog('flushGCA');
        } else {
            session.endDialog("You inserted a wrong Memo number.");
        }

    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    });

//Flush a single event
bot.dialog('flushGC', [
    function (session) {
        session.beginDialog('initGC');
    },
    function (session) {
        var calendar = google.calendar('v3');
        var gcEvs = {
            'summary': session.conversationData.events[session.conversationData.str - 1].Title.toString(),
            'description': session.conversationData.events[session.conversationData.str - 1].Description.toString(),
            'start': {
                'dateTime': proTimeGC(session.conversationData.events[session.conversationData.str - 1].Time).toString(),
            },
            'end': {
                'dateTime': proTimeGC(session.conversationData.events[session.conversationData.str - 1].Time).toString(),
            },
        };
        calendar.events.insert({
            auth: oauth2Client,
            calendarId: 'primary',
            resource: gcEvs,
        }, function (err, gcEvs) {
            if (err) {
                session.endDialog('There was an error contacting the Calendar service: ' + err);
                //return;
            } else session.endDialog('Event created: ' + gcEvs.htmlLink);
        });
    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    });

//Flush all events
bot.dialog('flushGCA', [
    function (session) {
        session.beginDialog('initGC');
    },
    function (session) {
        var calendar = google.calendar('v3');
        var tx = 0;
        for (var it = 1; it <= session.conversationData.events.length&&tx!=1; it++) {
            var gcEvs = {
                'summary': session.conversationData.events[it - 1].Title.toString(),
                'description': session.conversationData.events[it - 1].Description.toString(),
                'start': {
                    'dateTime': proTimeGC(session.conversationData.events[it - 1].Time).toString(),
                },
                'end': {
                    'dateTime': proTimeGC(session.conversationData.events[it - 1].Time).toString(),
                },
            };
            calendar.events.insert({
                auth: oauth2Client,
                calendarId: 'primary',
                resource: gcEvs,
            });
        }
        session.endDialog("If successfull "+session.conversationData.events.length+" Memo(s) pushed. Check for push: https://calendar.google.com/calendar/");
    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    });


//Set OAuth Parameters.
bot.dialog('initGC', [
    function (session) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        builder.Prompts.text(session, 'Authorize this app by visiting this url: ' + authUrl);
    },
    function (session, results) {
        oauth2Client.getToken(results.response, function (err, token) {
            if (err) {
                session.endDialog('Error while trying to retrieve access token.' + err);
            } else {
                oauth2Client.credentials = token;
                session.endDialog("Success! Please note that the process will generate an error, if wrong Code was inserted.");
            }
        });

    }
]).cancelAction(
    "cancelOrder", "Type anything to continue.", {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel the entery operation. Are you sure?"
    });

//---------------------------------------------------------------------------------------------------------------------
/* Misc Operations Beyond this*/

//BOT - Default Dialog - Greetings - Automatic Greetings
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.send(new builder.Message()
                    .address(message.address)
                    .text("MemoBot: (type Help for help)"));
                bot.beginDialog(message.address, '/');
            }
        });
    }
});

//BOT - Dialog - Quit/Reset Operation
bot.dialog('quit', [function (session, args) {
    session.conversationData = {};
    oauth2Client = null;
    session.endConversation("Type anything to restart.");
    bot.beginDialog('/');
}]).triggerAction({
    matches: /^quit$|^bye$|^over$|^end$/i,
});


//Function to process time in the sample which is required by Google API
function proTimeGC(date) {
    //Generic - Date Time processor -- NPM library
    var datetime = require('node-datetime');
    ///////////////////////////////////////////////////////////////////
    var sdate = new Date(date).toLocaleString().toString();
    var dt = datetime.create(date);
    var formatted = dt.format('Y-m-d H:M:S');
    date = new Date(date).toString();
    var str = formatted.substring(0, 10);
    str += 'T';
    str += formatted.substring(11, 19);
    str += date.substring(28, 31);
    str += ':'
    str += date.substring(31, 33);
    return str;
}