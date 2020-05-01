var times;
var resp="";

console.log("Actual Date:" + new Date())
require("http").get("http://worldtimeapi.org/api/timezone/Europe/Prague", function(res) {
  res.on('data', function(response) {
    console.log("HTTP> "+response);
    resp+=response
  });
  res.on('close', function(data) {
    console.log("Connection closed");
    times=JSON.parse(resp).unixtime;
    setTime(times);
    console.log("Date set to:" + new Date())

  });
});
