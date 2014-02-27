var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (websecurify, params) {
    var self = this;
    self.writable = true;
    self.websecurify = websecurify;
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
    this.body.push(s);
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
	
    if (s !== undefined) this.body.push(s);
    if (this.body.length === 0) {
        data = '';
    }
    else if (typeof this.body[0] === 'string') {
        data = this.body.join('');
    }
    else if (isArray(this.body[0])) {
        var body = [];
        for (var i = 0; i < this.body.length; i++) {
            body.push.apply(body, this.body[i]);
        }
        data = body;
    }
    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
        var len = 0;
        for (var i = 0; i < this.body.length; i++) {
            len += this.body[i].length;
        }
        var body = new(this.body[0].constructor)(len);
        var k = 0;
        
        for (var i = 0; i < this.body.length; i++) {
            var b = this.body[i];
            for (var j = 0; j < b.length; j++) {
                body[k++] = b[j];
            }
        }
        data = body;
    }
    else {
        var body = '';
        for (var i = 0; i < this.body.length; i++) {
            body += this.body[i].toString();
        }
        data = body;
    }
	
	var self = this;
	
	r = {
		method: this.method,
		url: this.uri,
		headers: this.headers,
		data: data,
		credentials: true,
	};
	this.websecurify.make_request(r, function (err, req) {
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
