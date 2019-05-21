const Discord = require("discord.js");

// This is your client. Some people call it `bot`, some people call it `self`,
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values.
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

// Loading Google Sheets API. =================================================
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// const TOKEN_PATH = 'token.json';
const TOKEN_PATH = 'token.json';

/**
* Create an OAuth2 client with the given credentials, and then execute the
* given callback function.
* @param {Object} credentials The authorization client credentials.
* @param {function} callback The callback to call with the authorized client.
*/
function authorize(credentials, callback, param1) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getNewToken(oAuth2Client, callback, param1);
      var tokenObj = JSON.parse(token);
      tokenObj.access_token = process.env.ACCESS_TOKEN;
      tokenObj.refresh_token = process.env.REFRESH_TOKEN;
      oAuth2Client.setCredentials(tokenObj);
      if (param1 != null) {
        callback(oAuth2Client, param1);
      }
      else {
        callback(oAuth2Client);
      }
    });
  }

  /**
  * Get and store new token after prompting for user authorization, and then
  * execute the given callback with the authorized OAuth2 client.
  * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
  * @param {getEventsCallback} callback The callback for the authorized client.
  */
  function getNewToken(oAuth2Client, callback, param1) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error while trying to retrieve access token', err);
        oAuth2Client.setCredentials(token);
        // Store relevant token info to env for later function executions
        process.env.ACCESS_TOKEN = token.access_token;
        token.access_token = "";
        token.refresh_token = "";
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        if (param1 != null) {
          callback(oAuth2Client, param1);
        }
        else {
          callback(oAuth2Client);
        }
      });
    });
  }

  function gsheetsCall(func, param1) {
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Sheets API.
      var contentObj = JSON.parse(content);
      contentObj.installed.client_secret = process.env.CLIENT_SECRET;
      authorize(contentObj, func, param1);
    });
  }

  /////////////////////////////////////////////////LOOK PRETTY/////////////////////////////////////////////////////
  function genBatUpReqBody(requests) {
    return {
      spreadsheetId: '18d4wyRXZPrCh0YHy-yAl5zsn-XrS29E0QxcPrLVnXEk',
      resource: {
        requests: requests,
        includeSpreadsheetInResponse: false
      }
    };
  }

  /* values is an array of string or int to be pushed in.
  */
  function genUpdateCellsReq(values, sheetId, rowIndex, columnIndex) {
    var vals = [];
    for (let i = 0; i < values.length; i++) {
      if (!(typeof values[i] == 'number')) {
        vals.push(
            {
              userEnteredValue: {
                stringValue: values[i]
              }
            }
        );
      }
      else {
        vals.push(
          {
            userEnteredValue: {
              numberValue: values[i]
            }
          }
        );
      }
    }
    return {
      updateCells: {
        rows: [
          {
            values: vals
          }
        ],
        fields: "userEnteredValue",
        start: {
          sheetId: sheetId,
          rowIndex: rowIndex,
          columnIndex: columnIndex
        }
      }
    };
  }


  client.on('error', console.error);

  client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
  });

  client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
  });

  client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
  });

  client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if(message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if(message.content.indexOf(config.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (message.guild == null && command != "help") {
      message.channel.send("Bad! Tried to do some nefarious things dincha?");
      return;
    }

    // Let's go with a few common example commands! Feel free to delete or change those.

    if(command === "ping") {
      // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
      // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
      const m = await message.channel.send("Ping?");
      m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }
    else {
      message.channel.send("Command not recognized.");
    }
  });

  client.login(process.env.TOKEN);
