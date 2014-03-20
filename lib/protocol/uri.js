/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true devel: true browser: true
         forin: true latedef: false globalstrict: true */
/*global define: true */

'use strict';

const { Cc, Ci, CC } = require('chrome')
const { Component } = require('./xpcom')

exports.CustomURI = Component.extend({
  originCharset: 'UTF-8',
  get asciiHost() this.host,
  get asciiSpec() this.spec,
  get hostPort() this.port === -1 ? this.host : this.host + ':' + this.port,
  clone: function clone() this,
  cloneIgnoringRef: function cloneIgnoringRef() this.clone(),
  equals: function equals(uri) this.spec === uri.spec,
  equalsExceptRef: function equalsExceptRef(uri) this.equals(uri),
  schemeIs: function schemeIs(scheme) this.scheme === scheme,
  resolve: function resolve(path) {
    this.spec + path
  }
})

exports.CustomURL = exports.CustomURI.extend({
  initialize: function initialize(uri) {
    this.spec = uri.href
    this.scheme = uri.scheme || ''
    this.host = uri.host || ''
    this.port = uri.port || ''
    this.path = uri.path || ''
    this.pathname = uri.pathname || uri.path || ''
    this.filePath = uri.pathname || uri.path || ''
    this.auth = uri.auth || ''
    this.query = uri.query || ''
    this.ref = uri.hash || uri.ref || ''
  },
  mutable: true,
  interfaces: [ Ci.nsIURI, Ci.nsIURL, Ci.nsIStandardURL, Ci.nsIMutable ],
  classDescription: 'Custom URL',
  contractID: '@mozilla.org/network/custom-url;1',
  getCommonBaseSpec: function (uri) {
    console.log('getCommonBaseSpec', uri.spec)
  },
  getRelativeSpec: function (uri) {
    console.log('getRelativeSpec', uri.spec)
  }
})
