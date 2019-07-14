// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
const axios = require('axios');
const mustacheExpress = require('mustache-express');
const { DateTime } = require("luxon");
const mockData = require("./darksky-mock-data.json");
require('dotenv').config();

// Register '.mustache' extension with The Mustache Express
app.engine('html', mustacheExpress());

app.set('view engine', 'html');
app.set('views', __dirname + '/views');


// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

let darkSkyCache = {
  lastUpdated: null, 
  data: {} //
};

let queryDarksky = () => { //Update dark sky
  return new Promise((resolve, reject) => {
    if(!darkSkyCache.lastUpdated || darkSkyCache.lastUpdated.plus({minutes: 5}) < DateTime.utc()) {
    axios.get(`https://api.darksky.net/forecast/${process.env.DARKSKY_APIKEY}/29.7193,-95.388`)
      .then(res => {
        //console.log(res.data);

        //Cashe
        darkSkyCache.data = res.data;
        darkSkyCache.lastUpdated = DateTime.utc();
        //Respond
        return resolve(darkSkyCache.data)
      }).catch(err => {
        return reject(err);
        console.error(err);
        
      })
  } else {
    return resolve(darkSkyCache.data)
  }
  })
}


// http://expressjs.com/en/starter/basic-routing.html
app.get('/weather', function(request, response) {
  
  //response Function
  function respond() {
    response.render('weather', {
        darksky: darkSkyCache.data,
        format: {
          currently: {
            temperature: function() {
              return Math.round(darkSkyCache.data.currently.temperature);
            },
            wind: function() { // only show gust if it is not the same as speed
              let speed = Math.round(darkSkyCache.data.currently.windSpeed);
              let gust = Math.round(darkSkyCache.data.currently.windGust);
              if(gust === speed) {
                return `${speed} mph`;
              } else {
                return `${speed} mph - ${gust} mph`
              }
            },
            uvIndex: function() { // convert numbers to low-high 
              let index = darkSkyCache.data.currently.uvIndex;
              if(index < 3) {
                return "Low";
              } else if (index < 6) {
                return "Medium";
              } else if(index < 8) {
                return "High";
              } else if(index < 11) {
                return "VERY HIGH";
              } else {
                return "EXTREME"
              }
            }
          },          
        }
    })
  }
  
  queryDarksky()
      .then(() => {
        console.log(darkSkyCache.lastUpdated.toISO())
        respond();
      }).catch((err) => {
        response.render('error', {
          errorType: "Dark Sky Error!",
          error: err
        })
      })
 
 
  //respond();
  
  
  /*response.render('SignageTest', {
            serverTime: new Date().toISOString()
  })*/
 
});
app.get('/radar', function(request, response) {
  queryDarksky()
      .then((data) => {
        console.log(darkSkyCache.lastUpdated.toISO())
        console.log(data.currently.nearestStormDistance)
        if(data.currently.nearestStormDistance <= 30) { // if the nearest storm is within 50 miles, then show radar
          return response.render('radar', {
          })
        } else { // show weather
          return response.redirect("/weather")
        }
      }).catch((err) => {
        return response.render('error', {
          errorType: "Dark Sky Error!",
          error: err
        })
      })
 
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});