
var WebServer = require('WebServer');
var wifi = require("Wifi");
var http = require("http");
const cfg = require("./config.js");

wifi.stopAP();

const ENV="prod"; //pokud je prod, tak prepoklada na vystupech RELE. Tedy ON = LOW
const sensorId = ENV=="prod"?"terarium-esp-prod":"terarium-esp-dev";

//default config object
var config={
  checkInterval: 30000, //init interval je kratky, prodlouzi se po nacteni z netu
  light: {
      startAt: '08:00:00',
      endAt: '18:00:00',
  },
  heat: {
     day: {
       min: 29.0,
       max: 31.0
     },
    night:{
      min: 21.5,
      max: 22.0
    }
  }
};

//data object
var state={
  sensors: {
    temp: 0,
    humidity:0,
  },
  mode: "day",
  output:{
    light: false,
    heat: false
  }
};

//PINS 
const HEAT_PIN=NodeMCU.D1;
const LIGHT_PIN=NodeMCU.D2;
const DHT_PIN=NodeMCU.D5;
var dht = require("DHT22").connect(DHT_PIN);

//setup pins and blink
E.on('init',function(){
  if(wifi.getStatus().station!='connected'){
      wifi.setSNTP("195.113.144.201",1);
      wifi.connect(cfg.wifi.ssid, {password: cfg.wifi.password},
           function(err){
              if(err)console.log(err);else console.log("wifi connected!");
              wifi.save();
      });
  } 
  pinMode(HEAT_PIN,"output");
  pinMode(LIGHT_PIN,"output");  
  pinMode(DHT_PIN,"input");
  setHeat(false);
  setLight(false);
  
  setLight(true);
  setTimeout(function(){
    setLight(false);
    setHeat(true);
    setTimeout(function(){
        setHeat(false);
      },3000);
  },3000);
  startServer();
});

// main function
var mainInterval = setInterval(function(){
    var dateStr = formatTime(new Date());
    if((dateStr>=config.light.startAt)&&(dateStr<=config.light.endAt)){
      state.mode = "day";
      state.output.light = true;
    } else {
      state.mode = "night";
      state.output.light = false;
    }

    measure().then(function(a){
        console.log(dateStr+' : '+state.mode+' : '+state.sensors.temp);
        //console.log(a);
        state.sensors.temp=a.temp;
        state.sensors.humidity=a.rh;
      
        if(a.temp <= config.heat[state.mode].min) state.output.heat=true;
        if(a.temp >= config.heat[state.mode].max) state.output.heat=false;

        setHeat(state.output.heat);
        setLight(state.output.light);
        
        sendToFirebase();
    });
},config.checkInterval);

function measure(){
  return new Promise(function(resolve, reject){
  dht.read(
      function (a){
        resolve(a);
      });
   });
}

function sendToFirebase(){
  console.log("Sending to firebase...");
  var payload = JSON.stringify(state);
  payload.sensorId=sensorId;

  var options = {
      host: cfg.dataUrlBase, // host name
      port: 80,            // (optional) port, defaults to 80
      path: '/terarium',           // path sent to server
      method: 'POST',       // HTTP command sent to server (must be uppercase 'GET', 'POST', etc)
      protocol: 'https:',   // optional protocol - https: or http:
      headers: { 
        'Content-Type': 'application/json',
        'token' :   cfg.token,
        'Content-Length': payload.length
      }
    };
  
  var req = http.request(options, function(res) {
    console.log('Status: ' + res.statusCode);
    //console.log('Headers: ' + JSON.stringify(res.headers));
    res.on('data', function(body) {
      //console.log('Body: ' + body);
      var pl=JSON.parse(body);
      if((pl.status==="ok") && (pl.data.command==="update")){
        console.log("New config:"+body);
        config = pl.data;
        changeInterval(mainInterval,config.checkInterval);
      }
    });
  });
  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
  req.write(payload);
  req.end();
}

function generateHtml(req, res, uri, webs){
         return {
           type: 'text/html',
           content:'<html lang="cz"><head>'+
                    '<meta charset="utf-8">'+
                    '<link rel="stylesheet" type="text/css" href="style.css"></head>'+
                    '<body>' +
                    '<h1>Ferdovo teraruim</h1>' +
                    '<table width="100%">'+
                     '<tr><td>Čas:</td><td>'+formatTime(new Date())+'</td><td>MODE</td><td>'+state.mode+'</td></tr>'+
                     '<tr><td>Teplota:</td><td>'+state.sensors.temp+'</td><td>LIGHT</td><td>'+state.output.light+'</td></tr>'+
                     '<tr><td>Vlhkost:</td><td>'+state.sensors.humidity+'</td><td>HEAT</td><td>'+state.output.heat+'</td></tr>'+
                    '</table>'+
                     '<p>'+JSON.stringify(state,null,2)+'</p>'+
                     '<p>'+JSON.stringify(config,null,2)+'</p>'+
                    '</body></html>'};
}

function startServer() {
    var webs = new WebServer({
        port: 80,
        memory: {
            'index.html':{
                type: 'text/html',
                content: '<html><head><meta http-equiv="refresh" content="0;url=index.njs"></head><body><a href="index.njs">KLIK</a></body>'
            },
            'index.njs': {
                'content':generateHtml,
            },
            'style.css':{
              'type':'text/css',
              'content': 'body{  width:500px;background-size:contain;background-repeat:no-repeat;background-image: url("https://epochalnisvet.cz/wp-content/uploads/Krajta-kr%C3%A1lovsk%C3%A1-se-vyzna%C4%8Duje-minim%C3%A1ln%C3%AD-agresivitou..jpg");}\n'+
                        'table{background-color: #ffffffaa;}'
            }
        }
    });

    webs.on('start', function (WebServer) {
        console.log('WebServer listening on port ' + WebServer.port);
    });
    webs.on('request', function (request, response, parsedUrl, WebServer) {
        console.log('WebServer requested', parsedUrl);
    });
    webs.on('error', function (error, WebServer) {
        console.log('WebServer error', error);
    });

    webs.createServer();
}

//spinani rele funguji opacne. ON = LOW. V devel modu spiname LED jako high.
function setHeat(state){
  if(ENV=="devel") digitalWrite(HEAT_PIN,state);
  else digitalWrite(HEAT_PIN,!state);
}

function setLight(state){
  if(ENV=="devel") digitalWrite(LIGHT_PIN,state);
  else digitalWrite(LIGHT_PIN,!state);
}

function formatTime(d){
  return pad(d.getHours(),2)+':'+pad(d.getMinutes(),2)+':'+pad(d.getSeconds(),2);
}

function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}
