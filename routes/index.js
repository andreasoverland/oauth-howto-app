'use strict';

const express = require('express');
const router = express.Router();
const https = require('https');
const querystring = require('querystring');

const appConfig = {
    "oauthServiceHostname": "oauth-howto.andreasoverland.com",
    "oauthServicePort": 443,
    "clientID": "ae156ee5a7c34a6eb8a90766e749e401",
    "clientSecret": "bdcb9b1243a0b894",
};


/* GET home page. */
router.get('/', (req, res) => {

    let content = {'title': 'OAuth Howto App'};
    res.render('index', content);

});

router.get('/initiate/', (req, res) => {

    fetchAuthorizeUrl((err, location) => {

        if (err === null) {
            res.redirect(location);
        }
        else {
            res.render('error', {error: err});
        }
    });

});

// Handle the callback URL
router.get('/callback/', (req, res) => {

    if (req.query.code) {

        fetchToken(req.query.code, (err, token) => {

            console.log(err, token);

            // TODO: Error-handling
            req.session.token = token;
            res.redirect('/authorized/');

        });
    }
    else {
        res.redirect('/');
    }

});


// Show page for users that have authorized the app
router.get('/authorized/', (req, res) => {
    if (req.session.token) {

        performApiCall( req.session.token, (err, response) => {
            if( err ){
                res.render('authorized', {title: 'Authorized', apiresponse:JSON.stringify(err) });
            }
            else {
                res.render('authorized', {title: 'Authorized', apiresponse:JSON.stringify(response) } ) ;
            }
        });


    }
    else {
        res.redirect('/')
    }
});


function fetchAuthorizeUrl(callback) {

    const options = {
        hostname: appConfig.oauthServiceHostname,
        port: appConfig.oauthServicePort,
        path: '/oauth/v2/authorize?response_type=code&client_id=' + appConfig.clientID,
        method: 'GET',
        headers: {
            'Accept-Charset': 'utf-8',
            'Accept': 'application/json'
        }
    };

    console.log('fetchAuthorizeUrl:', options);

    const request = https.request(options, (response) => {
        // TODO: handle error. The response.headers.location could be non existent, and an error code
        // could be present in the response object
        callback(null, response.headers.location);
    });

    request.end();

}

function fetchToken(callbackCode, callback) {

    const postData = querystring.stringify({
        'grant_type': 'authorization_code',
        'code': callbackCode
    });

    const options = {
        hostname: appConfig.oauthServiceHostname,
        port: appConfig.oauthServicePort,
        path: '/oauth/v2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + new Buffer(`${appConfig.clientID}:${appConfig.clientSecret}`).toString('base64')
        }
    };


    let buff = "";

    const request = https.request(options, (response) => {

        response.setEncoding('utf8');

        response.on('error', (error) => {
            return callback(error);
        });

        response.on('data', function (data) {
            buff += data;
        });

        // TODO: Handle errors.
        response.on('end', function (e) {
            const theBody = JSON.parse(buff);
            callback(null, theBody.access_token);
        });

    });

    request.write(postData);
    request.end();

}


function performApiCall(token, callback) {


    const options = {
        hostname: appConfig.oauthServiceHostname,
        port: appConfig.oauthServicePort,
        path: '/api/time/',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    };


    let buff = "";

    const request = https.request(options, (response) => {

        response.setEncoding('utf8');

        response.on('data', function (data) {
            buff += data;
        });

        response.on('error', (error) => {
           return callback(error);
        });

        response.on('end', function (e) {
            const body = JSON.parse(buff);
            return callback(null, body);
        });

    });

    request.end();


}


module.exports = router;
