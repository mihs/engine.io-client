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
  this.pollInterval = 5000;
  this.currentPollInterval = 100;
  this.pollScheduled = false;
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
  if (this.pollScheduled) {
    return;
  }

  clearTimeout(this.pollTimer);
  var self = this;
  this.pollTimer = setTimeout(function(){
    self.pollScheduled = false;
    self.currentPollInterval = self.currentPollInterval * 2;
    if (self.currentPollInterval > self.pollInterval) {
      self.currentPollInterval = self.pollInterval;
    }
    XHR.prototype.poll.call(self);
  }, this.currentPollInterval);
  this.pollScheduled = true;
};

/**
 * Check if the request contains only a ping response (a.k.a pong)
 */

DynamicP.prototype.write = function (packets) {
  this.onlyPong = (packets.length === 1 && 'pong' === packets[0].type);
  XHR.prototype.write.call(this, packets);
};

/**
 * Start a poll immediately after sending data because the probability of receiving data is higher.
 */

DynamicP.prototype.doWrite = function (data, fn) {
  var self = this;

  function cb() {
    fn();
    if (self.onlyPong || 'closed' === self.readyState) {
      return;
    }
    self.currentPollInterval = 100;
    if (!self.polling) {
      self.pollScheduled = false;
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
  this.pollScheduled = false;
  XHR.prototype.onClose.call(this);
};

DynamicP.prototype.doClose = function () {
  if ('open' == this.readyState) {
    XHR.prototype.doClose.call(this);
  }
};
