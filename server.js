#!/bin/env node
/* AeroGear Custom Javascript Builder
* https://github.com/aerogear/aerogear-js-builder
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
//  OpenShift sample Node application
var _ = require( 'underscore' ),
    express = require( 'express' ),
    app = express(),
    crypto = require( 'crypto' ),
    fs = require( 'fs' ),
    mime = require( 'mime' ),
    path = require( 'path' ),
    url = require( 'url' ),
    archiver = require('archiver'),
    rimraf = require( "rimraf" );

var dataDir = process.env.OPENSHIFT_DATA_DIR ? process.env.OPENSHIFT_DATA_DIR + "aerogear-js/" : "../aerogear-js/",
    tempSaveDir = process.env.OPENSHIFT_REPO_DIR ? process.env.OPENSHIFT_REPO_DIR + "data/" : "../aerogear-js-builder/data/",
    repoDir = process.env.OPENSHIFT_REPO_DIR ? process.env.OPENSHIFT_REPO_DIR : "../aerogear-js-builder/",
    sourceMapPrefix = process.env.OPENSHIFT_REPO_DIR ? "9" : "4";

/**
 *  Set up server IP address and port # using env variables/defaults.
 */
var ipaddress = process.env.OPENSHIFT_NODEJS_IP;
var port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

if (typeof ipaddress === "undefined") {
    //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
    //  allows us to run/test the app locally.
    console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
    ipaddress = "127.0.0.1";
}

app.set('port', port);
app.set('ipaddress', ipaddress);

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
function terminator(sig){
    if (typeof sig === "string") {
       console.log('%s: Received %s - terminating sample app ...',
                   Date(Date.now()), sig);
       process.exit(1);
    }
    console.log('%s: Node server stopped.', Date(Date.now()) );
}


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
//  Process on exit and signals.
process.on('exit', function() { terminator(); });

    // Removed 'SIGPIPE' from the list - bugz 852598.
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
     'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
    ].forEach(function(element, index, array) {
        process.on(element, function() { terminator(element); });
});

var app = express();

app.get( "/builder/deps", function( request, response ) {
    var callback = request.query.callback || request.query.jsonp,
        responseBody = "",
        packageJSON = require( dataDir + "package.json" ),
        aerogearJSON = require( "./js/aerogear.json" );

    if( packageJSON.version ) {
        aerogearJSON.version.version = packageJSON.version;
    }

    responseBody = JSON.stringify( aerogearJSON );

    if( callback ) {
        response.send( callback + "(" + responseBody + " ) " );
    } else {
        response.send( responseBody );
    }
});

app.get( '/builder/bundle/:owner/:repo/:ref/:name?', function ( req, res ) {
    var include = req.param( "include", "main" ).split( "," ),
        exclude = req.param( "exclude", "" ).split( "," ),
        external = req.param( "external", "" ).split( "," ),
        optimize = Boolean( req.param( "optimize", false ) ).valueOf(),
        name = req.params.name || ( req.params.repo + ".js" ),
        ext = (optimize !== "none" ? ".min" : "") + ( path.extname( name ) || ".js" ),
        mimetype = mime.lookup( ext ),
        shasum = crypto.createHash( 'sha1' ),
        dstDir, dstFile, digest, hash;

    if( external[0].length ) {
        include = external.concat( include );
    }
    var config = {
        include: include,
        exclude: exclude
    };
    shasum.update( JSON.stringify( config ) );
    shasum.update( mimetype );

    hash = shasum.digest( 'hex' );

    var directoryDate = Date.now();
    fs.mkdir( tempSaveDir + directoryDate + "/", 0755, function( err ) {
        if( err ) {
            errorResponse( res, err );
            throw err;
        }
        //Begin ReadFile
        fs.readFile( "gruntbase.js","utf-8", function( err, data) {
            if( err ) {
                errorResponse( res, err );
            }
            //build replacement
            var replacement = "[ ";
            _.each( config.include, function( val, index, list ) {
                replacement += "'" + val + ".js'";
                if( (index+1) !== list.length ) {
                    replacement += ", ";
                }
            });

            replacement += "]";
            var temp = data.replace("\"@SRC@\"", replacement)
                           .replace("\"@DEST@\"", "'" + tempSaveDir + directoryDate + "/<%= pkg.name %>.custom.js'" )
                           .replace("\"@DESTIIFE@\"", "'" + tempSaveDir + directoryDate + "/aerogear.custom.js'" )
                           .replace( "\"@DESTMIN@\"",  "'" + tempSaveDir + directoryDate + "/<%= pkg.name %>.custom.min.js'" )
                           .replace( "\"@DESTSOURCEMAP@\"", "'" + tempSaveDir + directoryDate + "/<%= pkg.name %>.custom.map'" )
                           .replace( "\"@CONCAT@\"", "'" + repoDir + "node_modules/grunt-contrib-concat/tasks'")
                           .replace( "\"@UGLY@\"", "'" + repoDir + "node_modules/grunt-contrib-uglify/tasks'")
                           .replace( "\"@SOURCEMAPNAME@\"", "'<%= pkg.name %>.custom.min.js'")
                           .replace( "\"@SOURCEMAPPREFIX@\"", sourceMapPrefix );
            //write a new temp grunt file
            fs.writeFile( tempSaveDir + directoryDate + "/" + hash + ".js", temp, "utf8", function( err ) {

                if( err ) {
                    errorResponse( res, err );
                    throw err;
                }
                var util  = require('util'),
                spawn = require('child_process').spawn,
                grunt = spawn( "./node_modules/grunt-cli/bin/grunt",["--verbose", "--base", dataDir, "--gruntfile", tempSaveDir + directoryDate + "/" + hash + ".js" ]);
                //base should be where the files are, config is the grunt.js file
                grunt.stdout.on('data', function (data) {
                    console.log('stdout: ' + data);
                });

                grunt.stderr.on('data', function (data) {
                    console.log('stderr: ' + data);
                });

                grunt.on('exit', function (code) {

                    //Files are created, time to zip them up
                    var archive = archiver( "zip" );

                    archive.on( "error", function( err ) {
                        console.log('zip up time err', err);
                        res.status( 500 ).send( { error: err } );
                    });

                    res.on( "close", function () {

                        //remove temp grunt file

                        rimraf( tempSaveDir + directoryDate + "/", function( err ) {
                            if( err ) {
                                console.log( err );
                            }
                        });

                        return res.status(200).send( "OK" ).end();
                    });

                    res.attachment( "aerogear.custom.zip" );

                    archive.pipe(res);

                    var files = [
                        tempSaveDir + directoryDate + "/aerogear.custom.min.js",
                        tempSaveDir + directoryDate + "/aerogear.custom.js",
                        tempSaveDir + directoryDate + "/aerogear.custom.min.js.map"
                    ];

                    for( var i in files ) {
                        archive.append( fs.createReadStream( files[ i ] ), { name: path.basename( files[ i ] ) });
                    }

                    archive.finalize();
                });
            });
        });
    //End ReadFIle
    });


    function errorResponse( res, err ) {
        res.status( 500 );
        res.send( err );
    }
});

/**
    Start the Server
*/
var server = app.listen(port, ipaddress, function() {
    console.log('%s: Node server started on %s:%d ...',
        Date(Date.now() ), server.address().address, server.address().port);
});

