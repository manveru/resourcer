require.paths.unshift(require('path').join(__dirname, '..'));

var sys = require('sys'),
    events = require('events');

var resourcer = exports;

function pp(obj) {
  sys.puts(sys.inspect(obj));
}

resourcer.Resource = require('resourcer/resource').Resource;

//
// Select a storage engine
//
resourcer.use = function (engine) {
    if (typeof(engine) === "string") {
        if (engine in this.engines) {
            this.engine = this.engines[engine];
        } else {
            throw new(Error)("unrecognised engine");
        }
    } else if (engine && engine.Connection) {
        this.engine = engine;
    } else {
        throw new(Error)("invalid engine");
    }
    return this;
};
//
// Connect to the default storage engine
//
resourcer.connect = function (uri, port, options) {
    var m, protocol = uri && (m = uri.match(/^([a-z]+):\/\//)) && m[1],
        engine = protocol ? this.engines[protocol] : this.engine;

    return this.connection = (function () {
        switch (engine.Connection.length) {
            case 0:
            case 3: return new(engine.Connection)(uri, port, options);
            case 2: return new(engine.Connection)(uri, options);
            case 1: return new(engine.Connection)(options);
        }
    })();
};

//
// Factory
//
resourcer.defineResource = function (name, definition) {
    if (typeof(name) === "function" && !definition) {
        definition = name;
        name = null;
    }

    name = capitalize(name || 'resource');

    var F = function Resource(attrs) {
        var that = this;

        this.properties = attrs || {};
        this.__proto__.constructor = arguments.callee;

        arguments.callee.prototype.__proto__ = resourcer.Resource.prototype;

        Object.keys(this.properties).forEach(function (k) {
            Object.defineProperty(that, k, {
                get: function () {
                    return this.readProperty(k);
                },
                set: function (val) {
                    return this.writeProperty(k, val);
                }
            });
        });
    };

    F.__proto__    = resourcer.Resource;
    F.resourceName = name;
    F.key          = 'id';

    F.schema = {
        name: name,
        properties: {
            id: { type: 'string', unique: true }
        },
        links: []
    };

    (definition || function () {}).call(F);

    return F;
};

resourcer.mixin = function (target) {
    var objs = Array.prototype.slice.call(arguments, 1);
    objs.forEach(function (o) {
        Object.keys(o).forEach(function (k) {
            target[k] = o[k];
        });
    });
    return target;
};

//
// Utilities
//
function capitalize(str) {
    return str && str[0].toUpperCase() + str.slice(1);
}