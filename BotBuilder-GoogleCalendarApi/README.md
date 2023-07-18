# MS BotBuilder + Google Calendar API - NodeJs

This is an example in which I used MS BotBuilder framework to access Google Calendar service. This is a MemoBot that helps a person to create and delete a list of task(s) and add these task(s) directly into Google Calendar. 

### Prerequisites

1) Knowledge of BotBuilder Framework in NodeJS.
2) Knowledge of Google Calendar API in NodeJS.
3) Some understanding of OAuth authentication standard. 

Assumed that NodeJS and NPM are already installed.

### Installation

1) Create a directory for this sample.

2) Install BotBuilder Framework with NPM by navigating to the folder that was just created:

    Run these:
	
	- npm install --save botbuilder
	- npm install --save restify
	

3) Sign-up for Google Developers account and create a OAuth Client ID to download client_secret.json - [Google Calendar Quickstart](https://developers.google.com/calendar/quickstart/nodejs)
4) Install Google API Library and Google Authentication Library with NPM by navigating to the folder that was created in step 1:

    Run these:
        
	- npm install googleapis@24.* --save
	- npm install google-auth-library@0.12.* --save
        

(Note: Please note that you install the exact Library version which are mentioned above because the in example of Google the API library and Authentication Library are incompatible.)

5) Install a generic Library npm-datetime:
    
    Run these:
        
	- npm install node-datetime --save

6) Get /src/app.js from this repository and place it with client_secret.json in the directory that was created in step 1.

## Running Procedure

In PowerShell navigate to the working directory and run this app using command:

  - node app.js

App itself is simple and self explanatory. 

## Built With

* [NodeJS](https://nodejs.org/)
* [BotBuilder Framework](https://dev.botframework.com)
* [GoogleAPI](https://developers.google.com/apis-explorer/)


## Authors

* **Manan Gaur** - [gaurmanan](https://github.com/gaurmanan)

## Acknowledgement

#### This example was built when intering at [Cerebrata Software Private Limited](https://www.cerebrata.com/) under the mentorship of [Gaurav Mantri](http://gauravmantri.com)
