/**
 * Module dependencies.
 */

var XHR = require('./polling-xhr')
  , util = require('../util')

/**
 * Module exports.
 */

module.exports = DynamicP;

/**
 * Dynamic polling.
 *
 * @param {Object} opts
 * @api private
 */

function DynamicP(opts) {
  this.pollInterval = opts.pingInterval;
  this.currentPollInterval = 100;
  XHR.call(this, opts);
}

/**
 * Inherits from Polling XHR.
 */

util.inherits(DynamicP, XHR);

/**
 * Transport name.
 */

DynamicP.prototype.name = "dynamicpolling";

/**
 * Poll only every "pingTimeout" seconds.
 */

DynamicP.prototype.poll = function () {
  if (this.polling) {
    return;
  }

  var self = this;
  clearTimeout(this.pollTimer);
  this.pollTimer = setTimeout(function(){
    self.pollTimer = null;
    self.currentPollInterval = self.currentPollInterval * 2;
    if (self.currentPollInterval > self.pollInterval) {
      self.currentPollInterval = self.pollInterval;
    }
    XHR.prototype.poll.call(self);
  }, this.currentPollInterval);
};

/**
 * Check if the request contains only a ping response (a.k.a pong)
 */

DynamicP.prototype.write = function (packets) {
  this.onlyPong = (packets.length === 1 && packets[0].type === 'pong');
  XHR.prototype.write.call(this, packets);
};

/**
 * Start a poll immediately after sending data because the probability of receiving data is higher.
 */

DynamicP.prototype.doWrite = function (data, fn) {
  var self = this;

  function cb() {
    fn();
    if (!self.onlyPong && self.readyState !== 'closed') {
      self.currentPollInterval = 100;
      delete self.onlyPong;
      self.poll();
    }
  }

  XHR.prototype.doWrite.call(this, data, cb);
};

/**
 * If data was received then decrease the poll interval to poll faster for more data.
 */

DynamicP.prototype.onPacket = function (packet) {
  if (packet.type !== 'ping') {
    this.currentPollInterval = 100;
  }
  XHR.prototype.onPacket.call(this, packet);
};

/**
 * Clear the timer when closing.
 */

DynamicP.prototype.onClose = function () {
  clearTimeout(this.pollTimer);
  XHR.prototype.onClose.call(this);
};
