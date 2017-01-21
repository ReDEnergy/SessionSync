'use strict';

// *****************************************************************************
// SDK Modules

const { Cc, Ci, Cu } = require('chrome'); 	// Cc, Ci, Cm, Cr, Cu, components

const MozBookmarksService	= Cc['@mozilla.org/browser/nav-bookmarks-service;1']
							.getService(Ci.nsINavBookmarksService);
const MozHistoryService		= Cc['@mozilla.org/browser/nav-history-service;1']
							.getService(Ci.nsINavHistoryService);
const MozTaggingService		= Cc["@mozilla.org/browser/tagging-service;1"]
							.getService(Ci.nsITaggingService);
const MozAnnotationService	= Cc['@mozilla.org/browser/annotation-service;1']
							.getService(Ci.nsIAnnotationService);
const ioService 			= Cc["@mozilla.org/network/io-service;1"]
							.getService(Ci.nsIIOService);

// const PlacesUtils = Cu.import("resource://gre/modules/PlacesUtils.jsm");
// console.log('PlacesUtils', PlacesUtils);

const AnnotationNS = 'bookmarkProperties/';

// *****************************************************************************
// Custom Modules

const JSUtils = require('../utils/general');

// *****************************************************************************
// API

var makeURI = function makeURI(aURL)
{
	return ioService.newURI(aURL, null, null);
};

// Objects that mirrors an interal Firefox bookmark item
// Only a few properties are kept in memory
// Changes events should be performed through this object
var MozBookmark = function MozBookmark(node, properties, copyNode)
{
	// display firefox internal properties
	if (copyNode == true)
	{
		JSUtils.copyProperties(node, this);
	} else {
		for (var key in properties) {
			if (node.hasOwnProperty(key))
				this[properties[key]] = node[key];
		}
	}
	
	if (!this.isFolder()) {
		this.isPinned = this.getAnnotation('pinned') === 'yes';
	}
};

MozBookmark.prototype.create = function create()
{
	// console.log(this, this.id);
	if (this.isFolder()) {
		this.id = MozBookmarksService.createFolder(this.parent, this.title, this.position);
		this.url = 'place:folder=' + this.id;
	} else {
		this.id = MozBookmarksService.insertBookmark(this.parent, makeURI(this.url), this.position, this.title);
	}
	
	if (this.description) {
		this.setDescription(this.description);
	}
};

MozBookmark.prototype.setTitle = function setTitle(title)
{
	this.title = title;
	this.title_lowercase = title.toLowerCase(); 
	MozBookmarksService.setItemTitle(this.id, title);
};


MozBookmark.prototype.setLocation = function setLocation(url)
{
	this.url = url;
	MozBookmarksService.changeBookmarkURI(this.id, makeURI(url));
};

MozBookmark.prototype.getDescription = function getDescription()
{
	if (this.description === undefined)
	{
		this.description = this.getAnnotation('description');
	}
	return this.description;
};

MozBookmark.prototype.setDescription = function setDescription(description)
{
	if (this.setAnnotation('description', description))
	{
		this.description = description;
	} 
};

MozBookmark.prototype.setAnnotation = function setAnnotation(name, value)
{
	try {
		MozAnnotationService.setItemAnnotation(this.id, AnnotationNS + name, value, 0, MozAnnotationService.EXPIRE_NEVER);
		return true;		
	} catch(err) {
		console.log(err);
		return false;		
	}
};

MozBookmark.prototype.getAnnotation = function getAnnotation(name)
{
	try {
		var anno = MozAnnotationService.itemHasAnnotation(this.id, AnnotationNS + name);
		if (anno) {
			return MozAnnotationService.getItemAnnotation(this.id, AnnotationNS + name);
		}
	} catch(err) {
		// TODO: may fail when id doesn't exist yet
		// console.log('Anno', AnnotationNS + name, err);
	}
};

MozBookmark.prototype.isFolder = function isFolder()
{
	if (this.url) {
		return this.url.substring(0, 13) === 'place:folder=';
	} 
};

// *****************************************************************************
// Public API
exports.MozBookmark = MozBookmark;
