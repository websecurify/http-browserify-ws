var Stream = require('stream');
var util = require('util');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

util.inherits(Response, Stream);

var capable = {
    streaming : false,
    status2 : true
};

Response.prototype.getResponse = function (res) {
	return res.responseBody;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (req) {
	var self = this;
	
	req.onerror = function (error) {
        if (!(error instanceof Error)) {
            error = new Error(error || 'error')
        }
		self.emit('ready');
		self.emit('error', error);
	};
	
	req.onabort = function (error) {
        if (!(error instanceof Error)) {
            error = new Error(error || 'abort')
        }
		self.emit('ready');
		self.emit('error', error);
	};
	
	req.ontimeout = function (error) {
        if (!(error instanceof Error)) {
            error = new Error(error || 'timeout')
        }
		self.emit('ready');
		self.emit('timeout', error);
	};
	
	req.onload = function (res) {
		self.statusCode = res.responseCode;
        self.statusMessage = res.responseMessage;
		self.headers = res.responseHeaders;
		
		self.emit('ready');
		
		self._emitData(res);
		
		self.emit('end');
		self.emit('close');
	};
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
	
	if (!respBody) {
		return;
	}
	
    if (respBody instanceof ArrayBuffer) {
        this.emit('data', Buffer.from(new Uint8Array(respBody, this.offset)));
        this.offset = respBody.byteLength;
        return;
    } else
    if (respBody.length > this.offset) {
        this.emit('data', Buffer.from(respBody.slice(this.offset)));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};
