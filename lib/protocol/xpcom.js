/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true devel: true browser: true
         forin: true latedef: false */
/*global define: true */

!define(function(require, exports, module) {

'use strict';

const { Cc, Ci, Cr, Cm } = require('chrome')
const { Base } = require('./selfish')

const { generateUUID } = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator)

const { registerFactory, unregisterFactory } =
      Cm.QueryInterface(Ci.nsIComponentRegistrar)

function equals(value) this.equals(value)

exports.Component = Base.extend({
  classDescription: 'Jetpack generated class',
  initialize: function initialize() {
    this.classID = generateUUID()
  },
  QueryInterface: function QueryInterface(iid) {
    var implementsIntrface = iid.equals(Ci.nsISupports) ||
                             this.interfaces.some(equals, iid)
    if (!implementsIntrface) throw Cr.NS_ERROR_NO_INTERFACE
    return this
  },
  createInstance: function(outer, iid) {
    try {
      if (outer)
        throw Cr.NS_ERROR_NO_AGGREGATION
      return ('create' in this ? this.create() : this).QueryInterface(iid)
    } catch (error) {
      console.exception(error)
      throw error instanceof Ci.nsIException ? error : Cr.NS_ERROR_FAILURE
    }
  },
  register: function register() {
    registerFactory(this.classID, this.classDescription, this.contractID, this)
    return this
  },
  unregister: function() {
    unregisterFactory(this.classID, this)
    return this
  }
})

});
