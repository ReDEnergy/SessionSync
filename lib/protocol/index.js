/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true devel: true browser: true
         forin: true latedef: false globalstrict: true */
/*global define: true */

'use strict';

const { AboutHandler, ProtocolHandler } = require('./protocol')


exports.about = function(about, handler) {
  return AboutHandler.extend(handler, { scheme: about }).new()
}

exports.protocol = function(scheme, handler) {
  return ProtocolHandler.extend(handler, { scheme: scheme }).new()
}
