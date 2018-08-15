const Twitter = require('twitter');
const authAPI = require('./config/twitter.js');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const Friends = require('./db.js').Friends;
const Users = require('./db.js').Users;
const getFriends = require('./friends.js');
const addFriend = require('./addFriend.js');
const port = process.env.PORT || 3001;

// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var app = express();

// Logging and parsing
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/health', (req, res) => {
    res.writeHead(200);
    res.end('healthy');
})

app.post('/friends/:friendId/:viewerId', async (req, res) => {
  try {
    console.log('in post friends');
    let friendId = req.params.friendId;
    let viewerId = req.params.viewerId;
    console.log('friendId in index', friendId);
    console.log('viewerId in index', viewerId);
    // refactor to a promise all
    let viewer = await Users.findOne({id: viewerId});
    let friends = await Friends.findOne({id: viewerId});
    let tokenKey = viewer.twitterTokenKey;
    let tokenSecret = viewer.twitterTokenSecret;
    let client = new Twitter({
      consumer_key: authAPI.TWITTER_CONSUMER_KEY,
      consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
      access_token_key: tokenKey,
      access_token_secret: tokenSecret
    });
    let friend = await addFriend(client, friendId, viewerId, viewer.friends);
    console.log('friend in index', friend);
    res.writeHead(201);
    res.end(friend);
  } catch(err) {
    console.log('ERROR in post /friends/:friendId/:viewerId', err);
    res.writeHead(404);
    res.end(err);
  }
})

app.get('/friends/:userId/:viewerId', async (req, res) => {
  try {
    let userId = req.params.userId;
    let viewerId = req.params.viewerId;
    console.log('userId in friendsAPI', userId);
    console.log('viewerId in friendsAPI', viewerId);
    // used to refresh friends for userId, viewer's tokens are used
    let message = viewerId + '.' + userId;
    let user = await Friends.findOne({id: userId});
    console.log('user from friendsDB', user);
    if (user && user.friends.length) {
      let friends = user.friends;
      let refreshedFriendsDate = user.refreshedFriendsDate;
      console.log('refreshedFriendsDate', refreshedFriendsDate);
      let currentDate = new Date();
      let hours = Math.abs(refreshedFriendsDate - currentDate) / 36e5;
      console.log('hours', hours);
      if (hours > 24) {
        console.log('hours > 24, need to refresh friends');
        let params = {
          DelaySeconds: 10,
          MessageBody: message,
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/292328237082/refresh-friends"
         };
         sqs.sendMessage(params, function(err, data) {
           if (err) {
             console.log("Error in refresh-friends", err);
           } else {
             console.log("Success in refresh-friends", data.MessageId);
           }
         });
        res.writeHead(200);
        res.end(JSON.stringify([friends, false]));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify([friends, true]));
      }
    } else {
      let viewer = await Users.findOne({id: viewerId})
      console.log('viewer object in friendsAPI', viewer);
      let tokenKey = viewer.twitterTokenKey;
      let tokenSecret = viewer.twitterTokenSecret;
      let client = new Twitter({
        consumer_key: authAPI.TWITTER_CONSUMER_KEY,
        consumer_secret: authAPI.TWITTER_CONSUMER_SECRET,
        access_token_key: tokenKey,
        access_token_secret: tokenSecret
      });
      console.log("friends weren't found in db, need to refresh for first time");
      let params = {
        DelaySeconds: 10,
        MessageBody: message,
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/292328237082/refresh-friends"
       };
       sqs.sendMessage(params, function(err, data) {
         if (err) {
           console.log("Error in refresh-friends", err);
         } else {
           console.log("Success in refresh-friends", data.MessageId);
         }
       });
      let friends = await getFriends(client, userId);
      res.writeHead(200);
      res.end(JSON.stringify([friends, false]));
    }
  } catch(err) {
    console.log('ERROR in friendsAPI', err);
    res.writeHead(404);
    res.end(err);
  }
})

// Launch the server
app.listen(port, () => {
	console.log(`listening on port ${port}`);
})
