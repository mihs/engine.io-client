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
 * Clear the timer when closing.
 */

DynamicP.prototype.onClose = function () {
  clearTimeout(this.pollTimer);
  this.pollScheduled = false;
  XHR.prototype.onClose.call(this);
};
