/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true devel: true browser: true
         forin: true latedef: false globalstrict: true */
/*global define: true */

'use strict';

const { Cc, Ci, CC } = require('chrome')
const { Component } = require('./xpcom')
const { Base } = require('./selfish')
const { CustomURL } = require('./uri')

const StandardURL = CC('@mozilla.org/network/standard-url;1',
                       'nsIStandardURL', 'init')
const Pipe = CC('@mozilla.org/pipe;1', 'nsIPipe', 'init')
const Channel = CC('@mozilla.org/network/input-stream-channel;1',
                   'nsIInputStreamChannel')
const SecurityManager = CC('@mozilla.org/scriptsecuritymanager;1',
                     'nsIScriptSecurityManager')()
const Principal = SecurityManager.getSimpleCodebasePrincipal ? SecurityManager.getSimpleCodebasePrincipal.bind(SecurityManager) :
                                                               SecurityManager.getCodebasePrincipal.bind(SecurityManager);
const IOService = Cc['@mozilla.org/network/io-service;1'].
                  getService(Ci.nsIIOService)
const URI = IOService.newURI.bind(IOService)
const URIChannel = IOService.newChannel.bind(IOService)

const Response = Base.extend({
  initialize: function initialize(uri, stream) {
    this.uri = this.originalURI = this.principalURI = uri
    this._write = stream.write.bind(stream)
    this._close = stream.close.bind(stream)
    this.contentLength = -1
    this.contentType = ''
  },
  write: function write(content) {
    this._write(content, content.length)
  },
  end: function end(content) {
    if (content) this.write(content)
    this._close()
  }
})

exports.AbstractHandler = {
  newChannel: function newChannel(uri) {
    var channel, pipe, response, request

    pipe = Pipe(true, true, 0, 0, null)
    request = { uri: uri.spec }
    response = Response.new(request.uri, pipe.outputStream)

    this.onRequest(request, response)

    // If `uri` is modified on the response object then it's a redirect.
    // In this case we just create a channel from the URI to which request
    // was redirected.
    if (response.uri !== request.uri) {
      response.end()
      channel = URIChannel(response.uri, null, null)
      // Setting original URI so so that the original pre-redirect URI can
      // still be obtained.
      channel.originalURI = uri
    }
    // Otherwise we create a channel from the input stream of the pipe, so that
    // users can asynchronously write into it.
    else {
      channel = Channel()
      channel.setURI(uri)
      channel.contentStream = pipe.inputStream
      channel.QueryInterface(Ci.nsIChannel)
      // Setting length & type of the content to whatever users have set, or
      // defaults that indicate that they are unknown.
      channel.contentLength = response.contentLength
      channel.contentType = response.contentType
    }

    // If `principalURI` has been modified this means that owner corresponding
    // for this channel is different and we need to inherit it's privileges.
    // This is handy, for custom URI that just proxy to a content of the
    // different URIs.
    if (response.principalURI !== request.uri)
      channel.owner = Principal(URI(response.principalURI, null, null))

    return channel
  }
}

exports.AboutHandler = Component.extend(exports.AbstractHandler, {
	interfaces: [ Ci.nsIAboutModule ],
	get classDescription() {
		return 'Protocol handler for "about:' + this.scheme + '"'
	},
	get contractID() {
		return "@mozilla.org/network/protocol/about;1?what=" + this.scheme
	},
	getURIFlags: function(uri) {
		return Ci.nsIAboutModule.ALLOW_SCRIPT;
	}
})

exports.ProtocolHandler = Component.extend(exports.AbstractHandler, {
  interfaces: [ Ci.nsIProtocolHandler ],
  get classDescription() {
    return 'Protocol handler for "' + this.scheme + ':*"'
  },
  get contractID() {
    return "@mozilla.org/network/protocol;1?name=" + this.scheme
  },
  allowPort: function(port, scheme) {
    return false
  },
  defaultPort: -1,
  // For more information on what these flags mean,
  // see caps/src/nsScriptSecurityManager.cpp.
  protocolFlags: Ci.nsIProtocolHandler.URI_NORELATIVE
               | Ci.nsIProtocolHandler.URI_IS_UI_RESOURCE
               | Ci.nsIProtocolHandler.URI_DANGEROUS_TO_LOAD,
  /**
   * Property describe how to normalize an URL.
   * @see https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIStandardURL#Constants
   */
  type: 1,
  newURI: function newURI(relative, charset, base) {
    return !this.onResolve ? this.newURL(relative, charset, base)
           : CustomURL.new(this.onResolve(relative, base && base.spec, charset))
  },
  newURL: function newURL(relative, charset, base) {
    var url = StandardURL(this.type, this.defaultPort, relative, charset, base)
    url.QueryInterface(Ci.nsIURL)
    return url
  }
})
