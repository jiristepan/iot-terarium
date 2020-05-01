//run manualy

var wifi = require("Wifi");
var ssid="xxx"
var pass="yyy"

wifi.stopAP();

wifi.connect(ssid, {password:pass}, function(err){
  if(err){
    console.log("Wifi error: "+err)
    return
  }

  console.log("Connected:"+JSON.stringify(wifi.getIP()));
  wifi.save()
});


