// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
const axios = require('axios');
const mustacheExpress = require('mustache-express');
const { DateTime } = require("luxon");
const mockData = require("./darksky-mock-data.json");
const uuid = require('uuid/v4');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode')

require('dotenv').config();

// Register '.mustache' extension with The Mustache Express
app.engine('html', mustacheExpress());

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(cookieParser());


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
    //return resolve(mockData)
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
        console.log(data.currently.nearestStormDistance)
        if(data.currently.nearestStormDistance <= 15) { // if the nearest storm is within 15 miles, then show radar
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

app.get('/alerts', function(req, res) {
  let GA_ID=null;
  if(!req.cookies.GA) {
    GA_ID = uuid();
    res.cookie('GA', GA_ID, {expires: DateTime.utc().plus({years: 2}).toJSDate()});

  } else {
    GA_ID = req.cookies.GA;
  }
  
  console.log(GA_ID);
  
  axios.post(`https://www.google-analytics.com/collect?v=1&t=pageview&tid=${process.env.GA_TRACKING_ID}&cid=${GA_ID}&dp=%2Falerts`).then((response) => {
    console.log("/alerts:", "Google Analytics ")
  }).catch((err)=>{
    console.error("/alerts:", err);
  })
  
  return res.redirect("https://darksky.net/forecast/29.7196,-95.389/us12/en");
})

//generates qrcode that links to /alerts
app.get('/alerts/qr.png', function(req, res) {
  var baseURL = req.get('host');
  //console.log("/alerts/qr.png:", baseURL)
  
  QRCode.toDataURL(`http://${baseURL}/alerts`, { errorCorrectionLevel: 'H', width: "250"}, function (err, url) {
    if(err) {
      console.error("/alerts/qr.png:", err)
    }
    //console.log(url)
    const img = Buffer.from(url.split(",")[1], 'base64');
    res.writeHead(200, {
     'Content-Type': 'image/png',
     'Content-Length': img.length
     });
    res.end(img);
  })

})

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});