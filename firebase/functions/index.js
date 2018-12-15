const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {BigQuery} = require("@google-cloud/bigquery")
const moment = require('moment')
const config = require('./config.js')

const SCHEMA="sensorid:string,time:timestamp,temp:float,humidity:float,light:boolean,heat:boolean,mode:string"

const bigquery = new BigQuery({
    projectId: config.PROJECTID,
});   

console.log("Started v0.2")
// console.log(config)

admin.initializeApp(functions.config().firebase);
var db = admin.firestore();
const settings = {
    timestampsInSnapshots: true
};
db.settings(settings);

exports.terarium = functions.https.onRequest((request, response) => {
    // console.log(request.get("token"))
    var token = request.get('token')
    if (token !== config.TOKEN) {
        console.log("[ERROR] Unauthorized")
        response.status('403').send({
            status: "auth"
        })
    } else {
        const dataset = bigquery.dataset(config.BQDATASET);
        const table = dataset.table(config.BQTABLE);
        const out = {}

        //console.log(table)
        // console.log("Table:"+JSON.stringify(table))
        let pl=request.body
        var row={
            sensorid:pl.sensorId,
            time:moment().format('YYYY-MM-HH hh:mm:ss'),
            temp: pl.sensors.temp,
            humidity: pl.sensors.humidity,
            light: pl.output.light,
            heat: pl.output.heat,
            mode: pl.mode
        }

        console.log("[bigquery] storing:"+JSON.stringify(row))
        table.insert(row,{schema:SCHEMA})
        .then((out)=>{
            console.log("[bigquery] done.")
            out.bigquery=out

        //     console.log('[firestore] storing to /data/terarium/last ...')
        //     return db.collection('data')
        //     .doc('terarium').set(row)
        // })
        // .then(()=>{            
        //     console.log("[firestore] stored.");
        //     out.firestore = "written"
        
            console.log("[firestore] reading config ... ")
            return db.collection('config').doc('terarium').get()
        })
        .then((snap) => {
            let payload = {
                status: "ok",
                results: out,
                data: snap.data()
            }
            console.log('[firestore] Sending: '+JSON.stringify(payload))
            response.send(payload)
        })
        .catch((e)=>{
            console.log('[ERROR] '+JSON.stringify(e))
            response.status(500).send(e)
        })
    }
});