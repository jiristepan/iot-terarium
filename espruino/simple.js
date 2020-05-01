// minimalisticka varianta bez napojeni na net

const ENV="prod"; //pokud je prod, tak prepoklada na vystupech RELE. Tedy ON = LOW
const sensorId = ENV=="prod"?"terarium-esp-prod":"terarium-esp-dev"

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