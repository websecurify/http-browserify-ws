var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (websecurify, params) {
    var self = this;
    self.writable = true;
	self.method = params.method || 'GET';
	self.headers = [];
    self.body = [];
    
    self.uri = (params.scheme || 'http') + '://'
        + params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = params.headers[key];
            if (isArray(value)) {
                for (var j = 0; j < value.length; j++) {
					self.headers.push({name:key, value:value[j]});
                }
            }
            else self.headers.push({name:key, value:value});
        }
    }
    
    if (params.auth) {
        //basic auth
        self.headers.push(['Authorization', 'Basic ' + Base64.btoa(params.auth)]);
    }

    var res = new Response;
	
	self._res = res;
	
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });
};

inherits(Request, Stream);

Request.prototype.setTimeout = function (timeout) {
    this.timeout = timeout;
};

Request.prototype.setHeader = function (key, value) {
    if (isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            this.headers.push({name:key, value:value[i]});
        }
    }
    else {
        this.headers.push({name:key, value:value});
    }
};

Request.prototype.write = function (s) {
    if (s) {
        this.body.push(s);
    }
};

Request.prototype.destroy = function (s) {
	if (this._req) {
		this._req.abort();
		delete this._req;
		delete this._res;
	}
    this.emit('close');
};

Request.prototype.end = function (s) {
    var data;

    if (s) this.body.push(s);

    if (this.body.length === 0) {
        data = '';
    } else {
        data = Buffer.concat(this.body.filter(function (part) { return part }).map(function (part) {
            return Buffer.from(part);
        })).toString();
    }

    // TODO: should work with buffers

	var self = this;
	
	r = {
		method: this.method,
		url: this.uri,
		headers: this.headers,
		data: data,
		credentials: true,
	};

    if (this.timeout) {
        r.timeout = this.timeout
    }

	secappsExtensionAPI['2018-05-01'].makeRequest(r, function (err, req) {
		if (err) {
			self.emit('error', err);
			
			return;
		}
		
		self._req = req;
		
		self._res.handle(req);
	});
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};
