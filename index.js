const NEWCRAFTING = "1GRZ7y7-SjHR0KObQi1UZIywZn_BBx0HDGjesPnrsiEU";
const MAGICITEMS = "1xhue0HWq5slP7Y2whdL_xDT1-DSJu9EmbIjYq3Cnaqo";

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
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback, param1);
    var tokenObj = JSON.parse(token);
    /*
    tokenObj.access_token = process.env.ACCESS_TOKEN;
    tokenObj.refresh_token = process.env.REFRESH_TOKEN;
    */
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
    //contentObj.installed.client_secret = process.env.CLIENT_SECRET;
    authorize(contentObj, func, param1);
  });
}

// Start of client initialization and command parsing.

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


  // Let's go with a few common example commands! Feel free to delete or change those.

  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  if (command === "item") {
    if (args.length >= 1) {
      var str = "";
      for (let i = 0; i < args.length; i++) {
        str = str + args[i] + " ";
      }
      str = (str.substring(0, str.length - 1));
      gsheetsCall(lookup, [message, str]);
    }
    else {
      message.channel.send("Please specify the item you are looking up.");
    }
  }
  else {
    message.channel.send("Command not recognized.");
  }
});

client.login(config.token);

// Start of helper functions

async function lookup(auth, container) {
  const sheets = google.sheets({version: 'v4', auth});

  // Get magic item information- desc and type.
  sheets.spreadsheets.values.batchGet({
    spreadsheetId: MAGICITEMS,
    majorDimension: 'COLUMNS',
    ranges: [
      'Consumables!B3:E',
      'Coatings!A3:D',
      'Uncommon Magic Items!A5:C',
      'Rare Magic Items!A3:C',
      'Legendary Magic Items!A4:C'
    ]
  }, (err, res) => {
    if (err) {
      return console.log('The API returned an error: ' + err);
    }
    const reads = res.data.valueRanges;
    sheets.spreadsheets.values.get({
      spreadsheetId: NEWCRAFTING,
      majorDimension: 'COLUMNS',
      range: 'Discovered Recipes!A3:H'
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const rows = res.data.values;

      let outList = [];
      let itemList = [];
      let recipeIndexList = []; // Not actually- this keeps track of if an item has a recipe or not. 0 is no, 1 is yes.
      let descList = [];
      let itemIndex = -1;

      for (let i = 0; i < 5; i++) {
        for (const itemName of reads[i].values[0]) {
          itemIndex++;
          if (itemName.search(new RegExp(container[1], "i")) != -1) {
            itemList.push(itemName);
            recipeIndexList.push(0);

            let desc = "";
            let out = "";
            const types = ["Consumable", "Coating", "Uncommon Magic Item", "Rare Magic Item", "Legendary Magic Item"];
            if (i < 2) out += "Type: " + reads[i].values[1][itemIndex] + " " + types[i] + "\n";
            else out += "Type: " + types[i] + "\n";
            if (i < 2) {
              if (reads[i].values[3][itemIndex]) desc = reads[i].values[3][itemIndex];
            }
            else if (typeof reads[i].values[2][itemIndex]) desc = reads[i].values[2][itemIndex];
            descList.push(desc);
            outList.push(out);
            if (outList.length == 4) {
              break;
            }
          }
        }
        itemIndex = -1;
        if (outList.length == 4) {
          break;
        }
      }

      let category;
      for (const recipeName of rows[0]) {
        itemIndex++;
        if (recipeName != "" && rows[1][itemIndex] == "") {
          category = recipeName;
        }
        if (recipeName.search(new RegExp(container[1], "i")) != -1) {
          let index = itemList.indexOf(recipeName);
          let recipe = "";
          recipe += "Craft: " + category + "\n";
          recipe += "Cost: " + rows[2][itemIndex] + " dtd, " + rows[3][itemIndex] + "\n";
          recipe += "Requires: Total Bonus " + rows[7][itemIndex];
          if (rows[4][itemIndex]) recipe += " and a Table.";
          recipe += "\n"

          if (index == -1) { // It is in Recipes but not in Magic Items.
            if (outList.length < 4) {
              outList.push("**" + rows[0][itemIndex] + "**\n" + recipe + "Description: " + rows[5][itemIndex]);
            }
          }
          else { // It is in Magic Items, so we can complete data.
            if (!descList[index]) descList[index] = rows[5][itemIndex];
            outList[index] = "**" + itemList[index] + "**\n" + recipe + outList[index] + "Description: " + descList[index];
            recipeIndexList[index] = 1;
          }
        }
      }
      for (let i = 0; i < recipeIndexList.length; i++) {
        if (recipeIndexList[i] == 0) {
          outList[i] = "**" + itemList[i] + "**\n" + "_The recipe has not been or cannot be discovered._\n" + outList[i] + "Description: " + descList[i];
        }
      }
      if (outList.length == 0) {
        container[0].channel.send("No matches found for the item you are seeking.");
      } else {
        for (let i = 0; i < outList.length; i++) {
          for (let j = 0; j < outList[i].length; j += 2000) container[0].channel.send(outList[i].substring(j, j + 2000));
        }
      }
      if (outList.length == 4) {
        container[0].channel.send("**All searches are stopped at 4 items. Please enter a more specific name if the item you were looking for did not appear.**");
      }
    });
  });
}
