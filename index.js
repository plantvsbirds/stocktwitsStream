'use strict'
let phantom = require('phantom')
let request = require('then-request')
let prettyjson = require('prettyjson')
let mongoose = require('mongoose')

let Schema = mongoose.Schema
var twitSchema = new Schema({
  id : {
    type : String,
    index : true,
  }
}, { strict: false })

mongoose.connect("mongodb://localhost/stocktwits-scrap")


let log = (obj) => console.log(prettyjson.render(obj, { }))
let write = (obj) => process.stdout.write(JSON.stringify(obj))
let delay = (t) => new Promise((done) => setTimeout(done, t))

let PHANTOM
let clean = () => {
  try {
    PHANTOM.exit()
    let exec = require('child_process').exec
    exec('kill ' + PHANTOM.process.pid)
  } catch (e) {

  }
}

function StockTwitsStream() {
  this.startTime = Date.now()
  return (symbol, maxPost, streamId, limit) => 
  new Promise((resolve, reject) => {
    var self = this
    function rejectAndClean(reason) {
      log(reason)
      clean()
      reject()
    }
    let curretCollection = mongoose.model(symbol, twitSchema)
   //phantom.create('--proxy=proxy.crawlera.com:8010 --proxy-auth=ee70811e604e446c9bacda838d14d0f7: ',
   phantom.create().then(function(ph) {
    PHANTOM = ph
     ph.createPage().then(function(page) {
      page.setting('userAgent', 'Mozilla/5.0 (Windows NT 6.1 WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36')
      page.setting('loadImages', false)
      page.open('http://stocktwits.com/symbol/' + symbol).then(function(status) {
       console.log(status)
       page.property('content').then(function(content) {
         console.log('content loaded with length ' + content.length)
       })
       let replay = (maxPost) => {
        let replayBody = 'return requestRemote(\"http://stocktwits.com/streams/poll?stream=symbol&max=' + maxPost + '&stream_id=' + streamId + '&substream=top&item_id=' + streamId + '")'
        log (replayBody)
        return new Function("", replayBody)
       }
       let jobFinish = () => {
        page.close()
        ph.exit()
       }
       page.evaluate(function () {
        window.requestRemote = function (TARGET_ADDRESS) {
          return $.ajax({
            type: "GET",
            url: TARGET_ADDRESS,
            async: false
          }).responseText
        }
        return [!!requestRemote('/'), $('a.sign-in#popOutStream').attr('data-id')]
       }).then((result) => {
        console.log('injection status: ' + result[0])
        if (!streamId) streamId = result[1]
        Promise.all([
          curretCollection.findOne({}).sort({'id' : -1}),
          curretCollection.findOne({}).sort({'id' : 1 }),
        ]).then((res) => {
          let oldestTwitInDb = res[1]
          let latestTwitInDb = res[0]
          let startingPoint = oldestTwitInDb ? oldestTwitInDb.id : maxPost
          let done = 0

          let scrapFromStartingPoint = (startingPoint) => 
          page.evaluate(replay(startingPoint)).then((objText) => {
            return JSON.parse(objText).messages
          }).then((messages) => {
            log('add ' + messages.length)
            done += messages.length
            Promise.all(messages.map((self) => {
              let doc = new curretCollection(self)
              console.log(self.id)
              return doc.save()
            })).then((result) => {
              log(result)
              if (done > limit) {
                resolve()
              } else {
                return scrapFromStartingPoint(messages[messages.length - 1].id)
              }
            })
          })
          scrapFromStartingPoint(startingPoint).then(() => {
            log('all done. ' + done)
          })
        })

       })
     }).catch(rejectAndClean)
    })
   })
 })
}

module.exports = (settings) => new StockTwitsStream(settings)

var selfExec = () => {
  log('Not called as a module. Getting data from default')
  module.exports({

  })(process.argv[2] ,//|| '',
  process.argv[4] ,//|| '50713168',
  process.argv[3] ,//||  '11971',
  process.argv[5] || Infinity)
  .then((data) => {
    log(data)
    process.exit()
  } , (err) => log(err))
  .catch(log)
//102062
}

if (!module.parent)
  selfExec()


process.on('exit', (code) => {
  log('exiting with code ' + code)
})
