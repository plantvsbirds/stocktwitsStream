# stocktwitsStream
symbol -> stwocktwits newsfeed

![screenshot](http://g.recordit.co/Wf92yKLCo2.gif)

I actually wrote something to explain [how this works](http://zhuanlan.zhihu.com/p/20758761)


This is built to be hackable, **not** to be used.
Don't just download it and run it. Don't. Ever. Before you take a look in code.
It assumes a mongodb running locally, and writes to it.
It assumes a phantomjs installed locally.
It actually launches US and Russia's nuclear weapon without any prompt, so make sure you read/hack before use.

Possible usage
---
- (5 min hack) improve argv or output for your use
- (10min hack) turn to a module with proper config, default config
- (30min hack) add `commander` and few configs and turn it into good cli tool
- (30min hack) make the result a readable stream
