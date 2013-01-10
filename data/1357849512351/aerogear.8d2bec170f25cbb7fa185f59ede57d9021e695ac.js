/*! AeroGear JavaScript Library - v1.0.0.M2 - 2013-01-10
* https://github.com/aerogear/aerogear-js
* JBoss, Home of Professional Open Source
* Copyright Red Hat, Inc., and individual contributors
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* http://www.apache.org/licenses/LICENSE-2.0
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
(function( AeroGear, $, uuid, undefined ) {
    /**
        The Memory adapter is the default type used when creating a new store. Data is simply stored in a data var and is lost on unload (close window, leave page, etc.)
        @constructs AeroGear.DataManager.adapters.Memory
        @param {String} storeName - the name used to reference this particular store
        @param {Object} [settings={}] - the settings to be passed to the adapter
        @param {String} [settings.recordId="id"] - the name of the field used to uniquely identify a "record" in the data
        @param {Boolean} [settings.dataSync=false] - if true, any pipes associated with this store will attempt to keep the data in sync with the server (coming soon)
        @returns {Object} The created store
     */
    AeroGear.DataManager.adapters.Memory = function( storeName, settings ) {
        // Allow instantiation without using new
        if ( !( this instanceof AeroGear.DataManager.adapters.Memory ) ) {
            return new AeroGear.DataManager.adapters.Memory( storeName, settings );
        }

        settings = settings || {};

        // Private Instance vars
        var recordId = settings.recordId ? settings.recordId : "id",
            type = "Memory",
            data = null,
            dataSync = !!settings.dataSync;

        // Privileged Methods
        /**
            Returns the value of the private recordId var
            @private
            @augments Memory
            @returns {String}
         */
        this.getRecordId = function() {
            return recordId;
        };

        /**
            Returns the value of the private data var, filtered by sync status if necessary
            @private
            @augments Memory
            @param {Boolean} [dataSyncBypass] - get all data no matter it's sync status
            @returns {Array}
         */
        this.getData = function( dataSyncBypass ) {
            var activeData = [],
                item,
                syncStatus;

            if ( dataSync && !dataSyncBypass ) {
                for ( item in data ) {
                    syncStatus = data[ item ][ "ag-sync-status" ];
                    if ( syncStatus !== AeroGear.DataManager.STATUS_REMOVED ) {
                        activeData.push( data[ item ] );
                    }
                }
                return activeData;
            } else {
                return data;
            }
        };

        /**
            Sets the value of the private data var
            @private
            @augments Memory
         */
        this.setData = function( newData ) {
            if ( dataSync ) {
                for ( var item in newData ) {
                    newData[ item ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_NEW;
                }
            }
            data = newData;
        };

        /**
            Empties the value of the private data var
            @private
            @augments Memory
         */
        this.emptyData = function() {
            if ( dataSync ) {
                for ( var item in data ) {
                    data[ item ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_REMOVED;
                }
            } else {
                data = null;
            }
        };

        /**
            Adds a record to the store's data set
            @private
            @augments Memory
         */
        this.addDataRecord = function( record ) {
            data = data || [];
            if ( dataSync ) {
                record[ "ag-sync-status" ] = AeroGear.DataManager.STATUS_NEW;
                record.id = record.id || uuid();
            }
            data.push( record );
        };

        /**
            Adds a record to the store's data set
            @private
            @augments Memory
         */
        this.updateDataRecord = function( index, record ) {
            if ( dataSync ) {
                record[ "ag-sync-status" ] = AeroGear.DataManager.STATUS_MODIFIED;
            }
            data[ index ] = record;
        };

        /**
            Removes a single record from the store's data set
            @private
            @augments Memory
         */
        this.removeDataRecord = function( index ) {
            if ( dataSync ) {
                data[ index ][ "ag-sync-status" ] = AeroGear.DataManager.STATUS_REMOVED;
            } else {
                data.splice( index, 1 );
            }
        };

        /**
            Returns the value of the private dataSync var
            @private
            @augments Memory
            @returns {Boolean}
         */
        this.getDataSync = function() {
            return dataSync;
        };

        /**
            Little utility used to compare nested object values in the filter method
            @private
            @augments Memory
            @param {String} nestedKey - Filter key to test
            @param {Object} nestedFilter - Filter object to test
            @param {Object} nestedValue - Value object to test
            @returns {Boolean}
         */
        this.traverseObjects = function( nestedKey, nestedFilter, nestedValue ) {
            while ( typeof nestedFilter === "object" ) {
                if ( nestedValue ) {
                    // Value contains this key so continue checking down the object tree
                    nestedKey = Object.keys( nestedFilter )[ 0 ];
                    nestedFilter = nestedFilter[ nestedKey ];
                    nestedValue = nestedValue[ nestedKey ];
                } else {
                    break;
                }
            }
            if ( nestedFilter === nestedValue ) {
                return true;
            } else {
                return false;
            }
        };
    };

    // Public Methods
    /**
        Read data from a store
        @param {String|Number} [id] - Usually a String or Number representing a single "record" in the data set or if no id is specified, all data is returned
        @returns {Array} Returns data from the store, optionally filtered by an id
        @example
        var dm = AeroGear.DataManager( "tasks" ).stores[ 0 ];

        // Get an array of all data in the store
        var allData = dm.read();
     */
    AeroGear.DataManager.adapters.Memory.prototype.read = function( id ) {
        var filter = {};
        filter[ this.getRecordId() ] = id;
        return id ? this.filter( filter ) : this.getData();
    };

    /**
        Saves data to the store, optionally clearing and resetting the data
        @param {Object|Array} data - An object or array of objects representing the data to be saved to the server. When doing an update, one of the key/value pairs in the object to update must be the `recordId` you set during creation of the store representing the unique identifier for a "record" in the data set.
        @param {Boolean} [reset] - If true, this will empty the current data and set it to the data being saved
        @returns {Array} Returns the updated data from the store
        @example
        var dm = AeroGear.DataManager( "tasks" ).stores[ 0 ];

        // Store a new task
        dm.save({
            title: "Created Task",
            date: "2012-07-13",
            ...
        });

        // Update an existing piece of data
        var toUpdate = dm.read()[ 0 ];
        toUpdate.data.title = "Updated Task";
        dm.save( toUpdate );
     */
    AeroGear.DataManager.adapters.Memory.prototype.save = function( data, reset ) {
        var itemFound = false;

        data = AeroGear.isArray( data ) ? data : [ data ];

        if ( reset ) {
            this.setData( data );
        } else {
            if ( this.getData() ) {
                for ( var i = 0; i < data.length; i++ ) {
                    for( var item in this.getData() ) {
                        if ( this.getData()[ item ][ this.getRecordId() ] === data[ i ][ this.getRecordId() ] ) {
                            this.updateDataRecord( item, data[ i ] );
                            itemFound = true;
                            break;
                        }
                    }
                    if ( !itemFound ) {
                        this.addDataRecord( data[ i ] );
                    }

                    itemFound = false;
                }
            } else {
                this.setData( data );
            }
        }

        return this.getData();
    };

    /**
        Removes data from the store
        @param {String|Object|Array} toRemove - A variety of objects can be passed to remove to specify the item or if nothing is provided, all data is removed
        @returns {Array} Returns the updated data from the store
        @example
        var dm = AeroGear.DataManager( "tasks" ).stores[ 0 ];

        // Store a new task
        dm.save({
            title: "Created Task"
        });

        // Store another new task
        dm.save({
            title: "Another Created Task"
        });

        // Store one more new task
        dm.save({
            title: "And Another Created Task"
        });

        // Remove a particular item from the store by its id
        var toRemove = dm.read()[ 0 ];
        dm.remove( toRemove.id );

        // Remove an item from the store using the data object
        toRemove = dm.read()[ 0 ];
        dm.remove( toRemove );

        // Delete all remaining data from the store
        dm.remove();
     */
    AeroGear.DataManager.adapters.Memory.prototype.remove = function( toRemove ) {
        if ( !toRemove ) {
            // empty data array and return
            this.emptyData();
            return this.getData();
        } else {
            toRemove = AeroGear.isArray( toRemove ) ? toRemove : [ toRemove ];
        }
        var delId,
            data,
            item;

        for ( var i = 0; i < toRemove.length; i++ ) {
            if ( typeof toRemove[ i ] === "string" || typeof toRemove[ i ] === "number" ) {
                delId = toRemove[ i ];
            } else if ( toRemove ) {
                delId = toRemove[ i ][ this.getRecordId() ];
            } else {
                // Missing record id so just skip this item in the arrray
                continue;
            }

            data = this.getData( true );
            for( item in data ) {
                if ( data[ item ][ this.getRecordId() ] === delId ) {
                    this.removeDataRecord( item );
                }
            }
        }

        return this.getData();
    };

    /**
        Filter the current store's data
        @param {Object} [filterParameters] - An object containing key value pairs on which to filter the store's data. To filter a single parameter on multiple values, the value can be an object containing a data key with an Array of values to filter on and its own matchAny key that will override the global matchAny for that specific filter parameter.
        @param {Boolean} [matchAny] - When true, an item is included in the output if any of the filter parameters is matched.
        @returns {Array} Returns a filtered array of data objects based on the contents of the store's data object and the filter parameters. This method only returns a copy of the data and leaves the original data object intact.
        @example
        var dm = AeroGear.DataManager( "tasks" ).stores[ 0 ];

        // An object can be passed to filter the data
        var filteredData = dm.filter({
            date: "2012-08-01"
            ...
        });
     */
    AeroGear.DataManager.adapters.Memory.prototype.filter = function( filterParameters, matchAny ) {
        var filtered, key, j, k, l, nestedKey, nestedFilter, nestedValue,
            that = this;

        if ( !filterParameters ) {
            filtered = this.getData() || [];
            return filtered;
        }

        filtered = this.getData().filter( function( value, index, array) {
            var match = matchAny ? false : true,
                keys = Object.keys( filterParameters ),
                filterObj, paramMatch, paramResult;

            for ( key = 0; key < keys.length; key++ ) {
                if ( filterParameters[ keys[ key ] ].data ) {
                    // Parameter value is an object
                    filterObj = filterParameters[ keys[ key ] ];
                    paramResult = filterObj.matchAny ? false : true;

                    for ( j = 0; j < filterObj.data.length; j++ ) {
                        if( AeroGear.isArray( value[ keys[ key ] ] ) ) {
                            if( value[ keys [ key ] ].length ) {
                                if( $( value[ keys ] ).not( filterObj.data ).length === 0 && $( filterObj.data ).not( value[ keys ] ).length === 0 ) {
                                    paramResult = true;
                                    break;
                                } else {
                                    for( k = 0; k < value[ keys[ key ] ].length; k++ ) {
                                        if ( filterObj.matchAny && filterObj.data[ j ] === value[ keys[ key ] ][ k ] ) {
                                            // At least one value must match and this one does so return true
                                            paramResult = true;
                                            if( matchAny ) {
                                                break;
                                            } else {
                                                for( l = 0; l < value[ keys[ key ] ].length; l++ ) {
                                                    if( !matchAny && filterObj.data[ j ] !== value[ keys[ key ] ][ l ] ) {
                                                        // All must match but this one doesn't so return false
                                                        paramResult = false;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        if ( !filterObj.matchAny && filterObj.data[ j ] !== value[ keys[ key ] ][ k ] ) {
                                            // All must match but this one doesn't so return false
                                            paramResult = false;
                                            break;
                                        }
                                    }
                                }
                            } else {
                                paramResult = false;
                            }
                        } else {
                            if ( typeof filterObj.data[ j ] === "object" ) {
                                if ( filterObj.matchAny && that.traverseObjects( keys[ key ], filterObj.data[ j ], value[ keys[ key ] ] ) ) {
                                    // At least one value must match and this one does so return true
                                    paramResult = true;
                                    break;
                                }
                                if ( !filterObj.matchAny && !that.traverseObjects( keys[ key ], filterObj.data[ j ], value[ keys[ key ] ] ) ) {
                                    // All must match but this one doesn't so return false
                                    paramResult = false;
                                    break;
                                }
                            } else {
                                if ( filterObj.matchAny && filterObj.data[ j ] === value[ keys[ key ] ] ) {
                                    // At least one value must match and this one does so return true
                                    paramResult = true;
                                    break;
                                }
                                if ( !filterObj.matchAny && filterObj.data[ j ] !== value[ keys[ key ] ] ) {
                                    // All must match but this one doesn't so return false
                                    paramResult = false;
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    // Filter on parameter value
                    if( AeroGear.isArray( value[ keys[ key ] ] ) ) {
                        paramResult = matchAny ? false: true;

                        if( value[ keys[ key ] ].length ) {
                            for(j = 0; j < value[ keys[ key ] ].length; j++ ) {
                                if( matchAny && filterParameters[ keys[ key ] ] === value[ keys[ key ] ][ j ]  ) {
                                    //at least one must match and this one does so return true
                                    paramResult = true;
                                    break;
                                }
                                if( !matchAny && filterParameters[ keys[ key ] ] !== value[ keys[ key ] ][ j ] ) {
                                    //All must match but this one doesn't so return false
                                    paramResult = false;
                                    break;
                                }
                            }
                        } else {
                            paramResult = false;
                        }
                    } else {
                        if ( typeof filterParameters[ keys[ key ] ] === "object" ) {
                            paramResult = that.traverseObjects( keys[ key ], filterParameters[ keys[ key ] ], value[ keys[ key ] ] );
                        } else {
                            paramResult = filterParameters[ keys[ key ] ] === value[ keys[ key ] ] ? true : false;
                        }
                    }
                }

                if ( matchAny && paramResult ) {
                    // At least one item must match and this one does so return true
                    match = true;
                    break;
                }
                if ( !matchAny && !paramResult ) {
                    // All must match but this one doesn't so return false
                    match = false;
                    break;
                }
            }

            return match;
        });

        return filtered;
    };
})( AeroGear, jQuery, uuid );

//     node-uuid/uuid.js
//
//     Copyright (c) 2010 Robert Kieffer
//     Dual licensed under the MIT and GPL licenses.
//     Documentation and details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator, but
  // Math.random() does not guarantee "cryptographic quality".  So we feature
  // detect for more robust APIs, normalizing each method to return 128-bits
  // (16 bytes) of random data.
  var mathRNG, nodeRNG, whatwgRNG;

  // Math.random()-based RNG.  All platforms, very fast, unknown quality
  var _rndBytes = new Array(16);
  mathRNG = function() {
    var r, b = _rndBytes, i = 0;

    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      b[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return b;
  }

  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // WebKit only (currently), moderately fast, high quality
  if (_global.crypto && crypto.getRandomValues) {
    var _rnds = new Uint32Array(4);
    whatwgRNG = function() {
      crypto.getRandomValues(_rnds);

      for (var c = 0 ; c < 16; c++) {
        _rndBytes[c] = _rnds[c >> 2] >>> ((c & 0x03) * 8) & 0xff;
      }
      return _rndBytes;
    }
  }

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  // Node.js only, moderately fast, high quality
  try {
    var _rb = require('crypto').randomBytes;
    nodeRNG = _rb && function() {
      return _rb(16);
    };
  } catch (e) {}

  // Select RNG with best quality
  var _rng = nodeRNG || whatwgRNG || mathRNG;

  // Buffer class to use
  var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(byte) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[byte];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  // Export RNG options
  uuid.mathRNG = mathRNG;
  uuid.nodeRNG = nodeRNG;
  uuid.whatwgRNG = whatwgRNG;

  if (typeof(module) != 'undefined') {
    // Play nice with node.js
    module.exports = uuid;
  } else {
    // Play nice with browsers
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    }
    _global.uuid = uuid;
  }
}());

/**
    The AeroGear namespace provides a way to encapsulate the library's properties and methods away from the global namespace
    @namespace
 */
var AeroGear = {};

/**
    AeroGear.Core is a base for all of the library modules to extend. It is not to be instantiated and will throw an error when attempted
    @class
    @private
 */
AeroGear.Core = function() {
    // Prevent instantiation of this base class
    if ( this instanceof AeroGear.Core ) {
        throw "Invalid instantiation of base class AeroGear.Core";
    }

    /**
        This function is used internally by pipeline, datamanager, etc. to add a new Object (pipe, store, etc.) to the respective collection.
        @method
        @param {String|Array|Object} config - This can be a variety of types specifying how to create the object
        @returns {Object} The object containing the collection that was updated
     */
    this.add = function ( config ) {
        var i,
            current,
            collection = this[ this.collectionName ] || {};

        if ( !config ) {
            return this;
        } else if ( typeof config === "string" ) {
            // config is a string so use default adapter type
            collection[ config ] = AeroGear[ this.lib ].adapters[ this.type ]( config );
        } else if ( AeroGear.isArray( config ) ) {
            // config is an array so loop through each item in the array
            for ( i = 0; i < config.length; i++ ) {
                current = config[ i ];

                if ( typeof current === "string" ) {
                    collection[ current ] = AeroGear[ this.lib ].adapters[ this.type ]( current );
                } else {
                    collection[ current.name ] = AeroGear[ this.lib ].adapters[ current.type || this.type ]( current.name, current.settings || {} );
                }
            }
        } else {
            // config is an object so use that signature
            collection[ config.name ] = AeroGear[ this.lib ].adapters[ config.type || this.type ]( config.name, config.settings || {} );
        }

        // reset the collection instance
        this[ this.collectionName ] = collection;

        return this;
    };
    /**
        This function is used internally by pipeline, datamanager, etc. to remove an Object (pipe, store, etc.) from the respective collection.
        @method
        @param {String|String[]|Object[]|Object} config - This can be a variety of types specifying how to remove the object
        @returns {Object} The object containing the collection that was updated
     */
    this.remove = function( config ) {
        var i,
            current,
            collection = this[ this.collectionName ] || {};

        if ( typeof config === "string" ) {
            // config is a string so delete that item by name
            delete collection[ config ];
        } else if ( AeroGear.isArray( config ) ) {
            // config is an array so loop through each item in the array
            for ( i = 0; i < config.length; i++ ) {
                current = config[ i ];

                if ( typeof current === "string" ) {
                    delete collection[ current ];
                } else {
                    delete collection[ current.name ];
                }
            }
        } else if ( config ) {
            // config is an object so use that signature
            delete collection[ config.name ];
        }

        // reset the collection instance
        this[ this.collectionName ] = collection;

        return this;
    };
};

/**
    Utility function to test if an object is an Array
    @private
    @method
    @param {Object} obj - This can be any object to test
*/
AeroGear.isArray = function( obj ) {
    return ({}).toString.call( obj ) === "[object Array]";
};

(function( AeroGear, $, undefined ) {
    /**
        A collection of data connections (stores) and their corresponding data models. This object provides a standard way to interact with client side data no matter the data format or storage mechanism used.
        @class
        @augments AeroGear.Core
        @param {String|Array|Object} [config] - A configuration for the store(s) being created along with the DataManager. If an object or array containing objects is used, the objects can have the following properties:
        @param {String} config.name - the name that the store will later be referenced by
        @param {String} [config.type="memory"] - the type of store as determined by the adapter used
        @param {String} [config.recordId="id"] - the identifier used to denote the unique id for each record in the data associated with this store
        @param {Object} [config.settings={}] - the settings to be passed to the adapter
        @returns {object} dataManager - The created DataManager containing any stores that may have been created
        @example
        // Create an empty DataManager
        var dm = AeroGear.DataManager();

        // Create a single store using the default adapter
        var dm2 = AeroGear.DataManager( "tasks" );

        // Create multiple stores using the default adapter
        var dm3 = AeroGear.DataManager( [ "tasks", "projects" ] );
     */
    AeroGear.DataManager = function( config ) {
        // Allow instantiation without using new
        if ( !( this instanceof AeroGear.DataManager ) ) {
            return new AeroGear.DataManager( config );
        }

        // Super Constructor
        AeroGear.Core.call( this );

        this.lib = "DataManager";
        this.type = config ? config.type || "Memory" : "Memory";

        /**
            The name used to reference the collection of data store instances created from the adapters
            @memberOf AeroGear.DataManager
            @type Object
            @default stores
         */
        this.collectionName = "stores";

        this.add( config );
    };

    AeroGear.DataManager.prototype = AeroGear.Core;
    AeroGear.DataManager.constructor = AeroGear.DataManager;

    /**
        The adapters object is provided so that adapters can be added to the AeroGear.DataManager namespace dynamically and still be accessible to the add method
        @augments AeroGear.DataManager
     */
    AeroGear.DataManager.adapters = {};

    // Constants
    AeroGear.DataManager.STATUS_NEW = 1;
    AeroGear.DataManager.STATUS_MODIFIED = 2;
    AeroGear.DataManager.STATUS_REMOVED = 0;
})( AeroGear, jQuery );
